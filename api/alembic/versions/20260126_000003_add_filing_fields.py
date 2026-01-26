"""add filing fields to reports

Revision ID: 20260126_000003
Revises: 20260126_000002
Create Date: 2026-01-26 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260126_000003'
down_revision: Union[str, None] = '20260126_000002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('reports', sa.Column('filing_status', sa.String(length=50), nullable=True, comment='filed_mock, filed_live, failed, etc.'))
    op.add_column('reports', sa.Column('filed_at', sa.DateTime(), nullable=True, comment='When the report was filed'))
    op.add_column('reports', sa.Column('receipt_id', sa.String(length=100), nullable=True, comment='Filing receipt/confirmation ID'))
    op.add_column('reports', sa.Column('filing_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Full filing request/response payload'))
    
    op.create_index(op.f('ix_reports_filing_status'), 'reports', ['filing_status'], unique=False)
    op.create_index(op.f('ix_reports_receipt_id'), 'reports', ['receipt_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_receipt_id'), table_name='reports')
    op.drop_index(op.f('ix_reports_filing_status'), table_name='reports')
    op.drop_column('reports', 'filing_payload')
    op.drop_column('reports', 'receipt_id')
    op.drop_column('reports', 'filed_at')
    op.drop_column('reports', 'filing_status')
