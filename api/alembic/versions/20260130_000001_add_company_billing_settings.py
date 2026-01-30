"""Add company billing settings

Revision ID: 20260130_000001
Revises: 20260129_000003
Create Date: 2026-01-30

Adds per-company billing configuration:
- filing_fee_cents: Configurable fee per filing (default $75)
- payment_terms_days: Days until invoice is due (default 30)
- billing_notes: Internal notes about billing arrangements
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20260130_000001'
down_revision: Union[str, None] = '20260129_000003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add billing configuration to companies
    op.add_column(
        'companies',
        sa.Column('filing_fee_cents', sa.Integer(), nullable=False, server_default='7500')
    )
    op.add_column(
        'companies',
        sa.Column('payment_terms_days', sa.Integer(), nullable=False, server_default='30')
    )
    op.add_column(
        'companies',
        sa.Column('billing_notes', sa.Text(), nullable=True)
    )
    
    # Add index for billing queries
    op.create_index('ix_companies_filing_fee_cents', 'companies', ['filing_fee_cents'])


def downgrade() -> None:
    op.drop_index('ix_companies_filing_fee_cents', table_name='companies')
    op.drop_column('companies', 'billing_notes')
    op.drop_column('companies', 'payment_terms_days')
    op.drop_column('companies', 'filing_fee_cents')
