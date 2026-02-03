"""Add billing_type to Company and sent_to_email to Invoice

Revision ID: 20260203_000001
Revises: 20260130_000001_add_company_billing_settings
Create Date: 2026-02-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260203_000001'
down_revision = '20260130_000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add billing_type to companies table
    # Values: 'invoice_only' (trusted, Net 30), 'hybrid' (Net 10 + auto-charge), 'subscription' (future)
    op.add_column(
        'companies',
        sa.Column('billing_type', sa.String(50), nullable=False, server_default='invoice_only')
    )
    
    # Add sent_to_email to invoices table to track where invoice was sent
    op.add_column(
        'invoices',
        sa.Column('sent_to_email', sa.String(255), nullable=True)
    )
    
    # Add stripe fields to companies (for future hybrid tier)
    op.add_column(
        'companies',
        sa.Column('stripe_customer_id', sa.String(255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('invoices', 'sent_to_email')
    op.drop_column('companies', 'stripe_customer_id')
    op.drop_column('companies', 'billing_type')
