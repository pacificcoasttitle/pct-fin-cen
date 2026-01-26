"""
User model - represents PCT staff and client users.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import JSONBType


class User(Base):
    """
    A user of the PCT FinCEN system.
    
    Roles:
    - 'pct_admin': Full access to all features
    - 'pct_staff': Can process reports, manage parties
    - 'client_admin': Admin for a client company
    - 'client_user': Regular user for a client company
    
    Note: PCT internal staff have company_id = NULL
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    role = Column(String(50), nullable=False)  # pct_admin, pct_staff, client_admin, client_user
    clerk_id = Column(String(255), unique=True, nullable=True)  # For Clerk integration later
    status = Column(String(50), nullable=False, server_default="active")  # active, invited, disabled
    last_login_at = Column(DateTime, nullable=True)
    settings = Column(JSONBType, nullable=True, server_default="{}")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"), onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="users")
    submission_requests = relationship(
        "SubmissionRequest",
        foreign_keys="SubmissionRequest.requested_by_user_id",
        back_populates="requested_by"
    )
    assigned_requests = relationship(
        "SubmissionRequest",
        foreign_keys="SubmissionRequest.assigned_to_user_id",
        back_populates="assigned_to"
    )
    created_reports = relationship("Report", back_populates="created_by_user")

    def __repr__(self):
        return f"<User {self.email} role={self.role}>"
    
    @property
    def is_pct_staff(self) -> bool:
        """Check if user is PCT internal staff."""
        return self.role in ("pct_admin", "pct_staff")
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges."""
        return self.role in ("pct_admin", "client_admin")
