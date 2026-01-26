"""add notification_events table

Revision ID: 20260126_000002
Revises: init
Create Date: 2026-01-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260126_000002'
down_revision: Union[str, None] = 'init'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notification_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('party_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('party_token', sa.String(length=100), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False, comment='party_invite, party_submitted, internal_alert, filing_receipt'),
        sa.Column('to_email', sa.String(length=255), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=True),
        sa.Column('body_preview', sa.Text(), nullable=True, comment='Max 500 chars preview of body'),
        sa.Column('meta', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notification_events_created_at'), 'notification_events', ['created_at'], unique=False)
    op.create_index(op.f('ix_notification_events_party_id'), 'notification_events', ['party_id'], unique=False)
    op.create_index(op.f('ix_notification_events_party_token'), 'notification_events', ['party_token'], unique=False)
    op.create_index(op.f('ix_notification_events_report_id'), 'notification_events', ['report_id'], unique=False)
    op.create_index(op.f('ix_notification_events_type'), 'notification_events', ['type'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_notification_events_type'), table_name='notification_events')
    op.drop_index(op.f('ix_notification_events_report_id'), table_name='notification_events')
    op.drop_index(op.f('ix_notification_events_party_token'), table_name='notification_events')
    op.drop_index(op.f('ix_notification_events_party_id'), table_name='notification_events')
    op.drop_index(op.f('ix_notification_events_created_at'), table_name='notification_events')
    op.drop_table('notification_events')
