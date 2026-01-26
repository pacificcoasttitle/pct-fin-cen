"""add filing_submissions table

Revision ID: 20260126_000004
Revises: 20260126_000003
Create Date: 2026-01-26 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260126_000004'
down_revision: Union[str, None] = '20260126_000003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'filing_submissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('environment', sa.String(length=20), nullable=False, comment='staging or prod'),
        sa.Column('status', sa.String(length=50), nullable=False, comment='not_started, queued, submitted, accepted, rejected, needs_review'),
        sa.Column('receipt_id', sa.String(length=100), nullable=True),
        sa.Column('rejection_code', sa.String(length=50), nullable=True, comment='MISSING_FIELD, BAD_FORMAT, etc.'),
        sa.Column('rejection_message', sa.String(length=500), nullable=True),
        sa.Column('demo_outcome', sa.String(length=20), nullable=True, comment='accept, reject, needs_review - set via demo endpoint'),
        sa.Column('demo_rejection_code', sa.String(length=50), nullable=True),
        sa.Column('demo_rejection_message', sa.String(length=500), nullable=True),
        sa.Column('payload_snapshot', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, default=0),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_id')
    )
    op.create_index(op.f('ix_filing_submissions_report_id'), 'filing_submissions', ['report_id'], unique=True)
    op.create_index(op.f('ix_filing_submissions_status'), 'filing_submissions', ['status'], unique=False)
    op.create_index(op.f('ix_filing_submissions_receipt_id'), 'filing_submissions', ['receipt_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_filing_submissions_receipt_id'), table_name='filing_submissions')
    op.drop_index(op.f('ix_filing_submissions_status'), table_name='filing_submissions')
    op.drop_index(op.f('ix_filing_submissions_report_id'), table_name='filing_submissions')
    op.drop_table('filing_submissions')
