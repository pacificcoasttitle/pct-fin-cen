"""add email delivery tracking columns to notification_events

Revision ID: 20260127_000001
Revises: 20260126_000005
Create Date: 2026-01-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260127_000001'
down_revision: Union[str, None] = '20260126_000005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add delivery tracking columns to notification_events
    op.add_column('notification_events', 
        sa.Column('delivery_status', sa.String(20), nullable=True, server_default='pending'))
    op.add_column('notification_events',
        sa.Column('provider_message_id', sa.String(255), nullable=True))
    op.add_column('notification_events',
        sa.Column('sent_at', sa.DateTime(), nullable=True))
    op.add_column('notification_events',
        sa.Column('error_message', sa.Text(), nullable=True))
    
    # Create index on delivery_status for filtering
    op.create_index('ix_notification_events_delivery_status', 'notification_events', ['delivery_status'])


def downgrade() -> None:
    op.drop_index('ix_notification_events_delivery_status', table_name='notification_events')
    op.drop_column('notification_events', 'error_message')
    op.drop_column('notification_events', 'sent_at')
    op.drop_column('notification_events', 'provider_message_id')
    op.drop_column('notification_events', 'delivery_status')
