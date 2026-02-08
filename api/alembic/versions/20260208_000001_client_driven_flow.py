"""Client-driven flow: add initiated_by_user_id and auto_file fields

Revision ID: 20260208_000001
Revises: 20260203_000001_add_billing_type_and_invoice_email
Create Date: 2026-02-08
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260208_000001'
down_revision = '20260203_000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add initiated_by_user_id - who started this report (escrow officer)
    op.add_column('reports', sa.Column(
        'initiated_by_user_id', 
        sa.UUID(), 
        nullable=True,
        comment='User who initiated this report (escrow officer)'
    ))
    
    # Add auto_file_enabled - whether to auto-file when all parties complete
    op.add_column('reports', sa.Column(
        'auto_file_enabled', 
        sa.Boolean(), 
        server_default='true', 
        nullable=False,
        comment='Whether to auto-file when all parties complete'
    ))
    
    # Add auto_filed_at - when auto-file was triggered
    op.add_column('reports', sa.Column(
        'auto_filed_at', 
        sa.DateTime(), 
        nullable=True,
        comment='When auto-file was triggered'
    ))
    
    # Add notification_config - notification preferences
    op.add_column('reports', sa.Column(
        'notification_config', 
        postgresql.JSONB(astext_type=sa.Text()), 
        nullable=True,
        comment='Notification preferences for this report'
    ))
    
    # Create index on initiated_by_user_id
    op.create_index(
        'ix_reports_initiated_by_user_id', 
        'reports', 
        ['initiated_by_user_id'], 
        unique=False
    )
    
    # Create foreign key
    op.create_foreign_key(
        'fk_reports_initiated_by_user',
        'reports', 'users',
        ['initiated_by_user_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('fk_reports_initiated_by_user', 'reports', type_='foreignkey')
    op.drop_index('ix_reports_initiated_by_user_id', table_name='reports')
    op.drop_column('reports', 'notification_config')
    op.drop_column('reports', 'auto_filed_at')
    op.drop_column('reports', 'auto_file_enabled')
    op.drop_column('reports', 'initiated_by_user_id')
