"""
Audit Log API Routes
Provides access to audit trail for compliance and debugging.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])


# ============================================================================
# SCHEMAS
# ============================================================================

class AuditLogResponse(BaseModel):
    id: str
    action: str
    actor_type: str
    actor_user_id: Optional[str]
    details: dict
    ip_address: Optional[str]
    report_id: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    has_more: bool


class AuditStatsResponse(BaseModel):
    total_events: int
    events_today: int
    events_this_week: int
    top_event_types: List[dict]
    events_by_actor_type: dict


# ============================================================================
# LIST AUDIT LOGS
# ============================================================================

@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type (action)"),
    actor_type: Optional[str] = Query(None, description="Filter by actor type"),
    actor_id: Optional[str] = Query(None, description="Filter by actor user ID"),
    report_id: Optional[str] = Query(None, description="Filter by report ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List audit logs with filtering.
    Admin-only endpoint for compliance review.
    """
    query = db.query(AuditLog)
    
    # Filter by entity (stored in details.entity_type and details.entity_id)
    if entity_type:
        query = query.filter(AuditLog.details["entity_type"].astext == entity_type)
    
    if entity_id:
        query = query.filter(AuditLog.details["entity_id"].astext == entity_id)
    
    # Filter by event type (action)
    if event_type:
        query = query.filter(AuditLog.action == event_type)
    
    # Filter by actor
    if actor_type:
        query = query.filter(AuditLog.actor_type == actor_type)
    
    if actor_id:
        try:
            uuid_actor = UUID(actor_id)
            query = query.filter(AuditLog.actor_user_id == uuid_actor)
        except ValueError:
            pass
    
    # Filter by report
    if report_id:
        try:
            uuid_report = UUID(report_id)
            query = query.filter(AuditLog.report_id == uuid_report)
        except ValueError:
            pass
    
    # Date range filtering
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.filter(AuditLog.created_at >= start)
        except ValueError:
            pass
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            # Include entire end day
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(AuditLog.created_at <= end)
        except ValueError:
            pass
    
    # Get total count before pagination
    total = query.count()
    
    # Order and paginate
    logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()
    
    return AuditLogListResponse(
        logs=[
            AuditLogResponse(
                id=str(log.id),
                action=log.action,
                actor_type=log.actor_type,
                actor_user_id=str(log.actor_user_id) if log.actor_user_id else None,
                details=log.details or {},
                ip_address=log.ip_address,
                report_id=str(log.report_id) if log.report_id else None,
                created_at=log.created_at.isoformat() if log.created_at else None,
            )
            for log in logs
        ],
        total=total,
        has_more=(offset + limit) < total,
    )


# ============================================================================
# GET AUDIT TRAIL FOR ENTITY
# ============================================================================

@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_audit_trail(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
):
    """
    Get complete audit trail for a specific entity.
    Returns all events related to the entity in chronological order.
    """
    logs = db.query(AuditLog).filter(
        AuditLog.details["entity_type"].astext == entity_type,
        AuditLog.details["entity_id"].astext == entity_id,
    ).order_by(AuditLog.created_at.asc()).all()
    
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "event_count": len(logs),
        "events": [
            {
                "id": str(log.id),
                "action": log.action,
                "actor_type": log.actor_type,
                "actor_user_id": str(log.actor_user_id) if log.actor_user_id else None,
                "details": log.details or {},
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


# ============================================================================
# GET AUDIT TRAIL FOR REPORT
# ============================================================================

@router.get("/report/{report_id}")
async def get_report_audit_trail(
    report_id: str,
    db: Session = Depends(get_db),
):
    """
    Get complete audit trail for a report and all related entities.
    Includes parties, documents, filing events, etc.
    """
    try:
        uuid_report = UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID format")
    
    # Get all logs for this report
    logs = db.query(AuditLog).filter(
        AuditLog.report_id == uuid_report
    ).order_by(AuditLog.created_at.asc()).all()
    
    return {
        "report_id": report_id,
        "event_count": len(logs),
        "events": [
            {
                "id": str(log.id),
                "action": log.action,
                "actor_type": log.actor_type,
                "details": log.details or {},
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
    }


# ============================================================================
# AUDIT STATS (Executive Dashboard)
# ============================================================================

@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    db: Session = Depends(get_db),
):
    """
    Get aggregate audit statistics for executive dashboard.
    Shows event volume and breakdown without exposing PII.
    """
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # Total events
    total_events = db.query(AuditLog).count()
    
    # Events today
    events_today = db.query(AuditLog).filter(
        AuditLog.created_at >= today_start
    ).count()
    
    # Events this week
    events_this_week = db.query(AuditLog).filter(
        AuditLog.created_at >= week_start
    ).count()
    
    # Top event types
    top_types = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.action).order_by(desc('count')).limit(10).all()
    
    # Events by actor type
    actor_breakdown = db.query(
        AuditLog.actor_type,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.actor_type).all()
    
    return AuditStatsResponse(
        total_events=total_events,
        events_today=events_today,
        events_this_week=events_this_week,
        top_event_types=[
            {"event_type": t[0], "count": t[1]} for t in top_types
        ],
        events_by_actor_type={
            actor: count for actor, count in actor_breakdown
        },
    )
