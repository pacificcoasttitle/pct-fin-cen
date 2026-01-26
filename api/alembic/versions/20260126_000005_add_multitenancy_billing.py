"""add multitenancy and billing tables

Revision ID: 20260126_000005
Revises: 20260126_000004
Create Date: 2026-01-26 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260126_000005'
down_revision: Union[str, None] = '20260126_000004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === COMPANIES TABLE ===
    op.create_table(
        'companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('company_type', sa.String(50), nullable=False, server_default='client'),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('billing_contact_name', sa.String(255), nullable=True),
        sa.Column('address', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_companies_code')
    )
    op.create_index('ix_companies_code', 'companies', ['code'], unique=True)
    op.create_index('ix_companies_status', 'companies', ['status'], unique=False)

    # === USERS TABLE ===
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('clerk_id', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email'),
        sa.UniqueConstraint('clerk_id', name='uq_users_clerk_id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_company_id', 'users', ['company_id'], unique=False)
    op.create_index('ix_users_role', 'users', ['role'], unique=False)
    op.create_index('ix_users_status', 'users', ['status'], unique=False)

    # === INVOICES TABLE (must be before billing_events due to FK) ===
    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('subtotal_cents', sa.Integer(), nullable=False),
        sa.Column('tax_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('discount_cents', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_cents', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('voided_at', sa.DateTime(), nullable=True),
        sa.Column('payment_method', sa.String(50), nullable=True),
        sa.Column('payment_reference', sa.String(255), nullable=True),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invoice_number', name='uq_invoices_invoice_number')
    )
    op.create_index('ix_invoices_company_id', 'invoices', ['company_id'], unique=False)
    op.create_index('ix_invoices_status', 'invoices', ['status'], unique=False)
    op.create_index('ix_invoices_invoice_number', 'invoices', ['invoice_number'], unique=True)

    # === ADD COLUMNS TO REPORTS (before submission_requests due to FK) ===
    op.add_column('reports', sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('reports', sa.Column('escrow_number', sa.String(100), nullable=True))
    op.add_column('reports', sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    op.create_foreign_key('fk_reports_company_id', 'reports', 'companies', ['company_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_reports_created_by_user_id', 'reports', 'users', ['created_by_user_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_reports_company_id', 'reports', ['company_id'], unique=False)
    op.create_index('ix_reports_escrow_number', 'reports', ['escrow_number'], unique=False)

    # === SUBMISSION REQUESTS TABLE ===
    op.create_table(
        'submission_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('requested_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        # Transaction info
        sa.Column('escrow_number', sa.String(100), nullable=True),
        sa.Column('file_number', sa.String(100), nullable=True),
        sa.Column('property_address', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('expected_closing_date', sa.Date(), nullable=True),
        sa.Column('actual_closing_date', sa.Date(), nullable=True),
        sa.Column('transaction_type', sa.String(50), nullable=True),
        # Party info
        sa.Column('buyer_name', sa.String(255), nullable=True),
        sa.Column('buyer_type', sa.String(50), nullable=True),
        sa.Column('buyer_email', sa.String(255), nullable=True),
        sa.Column('buyer_phone', sa.String(50), nullable=True),
        sa.Column('seller_name', sa.String(255), nullable=True),
        sa.Column('seller_email', sa.String(255), nullable=True),
        # Transaction details
        sa.Column('purchase_price_cents', sa.BigInteger(), nullable=True),
        sa.Column('financing_type', sa.String(50), nullable=True),
        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('attachments', postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default='[]'),
        sa.Column('priority', sa.String(50), nullable=False, server_default='normal'),
        # Status
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('assigned_to_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=True),
        # Timestamps
        sa.Column('submitted_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['assigned_to_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_submission_requests_company_id', 'submission_requests', ['company_id'], unique=False)
    op.create_index('ix_submission_requests_status', 'submission_requests', ['status'], unique=False)
    op.create_index('ix_submission_requests_escrow_number', 'submission_requests', ['escrow_number'], unique=False)
    op.create_index('ix_submission_requests_report_id', 'submission_requests', ['report_id'], unique=False)

    # === ADD submission_request_id TO REPORTS ===
    op.add_column('reports', sa.Column('submission_request_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_reports_submission_request_id', 'reports', 'submission_requests', ['submission_request_id'], ['id'], ondelete='SET NULL')

    # === BILLING EVENTS TABLE ===
    op.create_table(
        'billing_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('report_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('submission_request_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('amount_cents', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('bsa_id', sa.String(100), nullable=True),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('invoiced_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['submission_request_id'], ['submission_requests.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_billing_events_company_id', 'billing_events', ['company_id'], unique=False)
    op.create_index('ix_billing_events_invoice_id', 'billing_events', ['invoice_id'], unique=False)
    op.create_index('ix_billing_events_report_id', 'billing_events', ['report_id'], unique=False)
    op.create_index('ix_billing_events_event_type', 'billing_events', ['event_type'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('ix_billing_events_event_type', table_name='billing_events')
    op.drop_index('ix_billing_events_report_id', table_name='billing_events')
    op.drop_index('ix_billing_events_invoice_id', table_name='billing_events')
    op.drop_index('ix_billing_events_company_id', table_name='billing_events')
    op.drop_table('billing_events')

    op.drop_constraint('fk_reports_submission_request_id', 'reports', type_='foreignkey')
    op.drop_column('reports', 'submission_request_id')

    op.drop_index('ix_submission_requests_report_id', table_name='submission_requests')
    op.drop_index('ix_submission_requests_escrow_number', table_name='submission_requests')
    op.drop_index('ix_submission_requests_status', table_name='submission_requests')
    op.drop_index('ix_submission_requests_company_id', table_name='submission_requests')
    op.drop_table('submission_requests')

    op.drop_index('ix_reports_escrow_number', table_name='reports')
    op.drop_index('ix_reports_company_id', table_name='reports')
    op.drop_constraint('fk_reports_created_by_user_id', 'reports', type_='foreignkey')
    op.drop_constraint('fk_reports_company_id', 'reports', type_='foreignkey')
    op.drop_column('reports', 'created_by_user_id')
    op.drop_column('reports', 'escrow_number')
    op.drop_column('reports', 'company_id')

    op.drop_index('ix_invoices_invoice_number', table_name='invoices')
    op.drop_index('ix_invoices_status', table_name='invoices')
    op.drop_index('ix_invoices_company_id', table_name='invoices')
    op.drop_table('invoices')

    op.drop_index('ix_users_status', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_company_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')

    op.drop_index('ix_companies_status', table_name='companies')
    op.drop_index('ix_companies_code', table_name='companies')
    op.drop_table('companies')
