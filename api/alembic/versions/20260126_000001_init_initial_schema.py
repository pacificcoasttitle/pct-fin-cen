"""Initial schema - reports, parties, links, documents, audit_log

Revision ID: init
Revises: 
Create Date: 2026-01-26 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'init'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### reports table ###
    op.create_table('reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, comment='draft, determination_complete, collecting, ready_to_file, filed, exempt'),
        sa.Column('property_address_text', sa.Text(), nullable=True, comment='Full property address as text'),
        sa.Column('closing_date', sa.Date(), nullable=True, comment='Transaction closing date'),
        sa.Column('filing_deadline', sa.Date(), nullable=True, comment='FinCEN filing deadline (30 days from closing)'),
        sa.Column('wizard_step', sa.Integer(), nullable=False, comment='Current wizard step number'),
        sa.Column('wizard_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Wizard form data by step'),
        sa.Column('determination', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Determination logic results and reasoning'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_status'), 'reports', ['status'], unique=False)

    # ### report_parties table ###
    op.create_table('report_parties',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('report_id', sa.UUID(), nullable=False),
        sa.Column('party_role', sa.String(length=50), nullable=False, comment='transferee, transferor, beneficial_owner, reporting_person'),
        sa.Column('entity_type', sa.String(length=50), nullable=False, comment='individual, llc, corporation, trust, partnership, other'),
        sa.Column('display_name', sa.String(length=255), nullable=True, comment='Name for display purposes'),
        sa.Column('party_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Full party information: name, address, ID documents, etc.'),
        sa.Column('status', sa.String(length=50), nullable=False, comment='pending, link_sent, in_progress, submitted, verified'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_report_parties_party_role'), 'report_parties', ['party_role'], unique=False)
    op.create_index(op.f('ix_report_parties_report_id'), 'report_parties', ['report_id'], unique=False)
    op.create_index(op.f('ix_report_parties_status'), 'report_parties', ['status'], unique=False)

    # ### party_links table ###
    op.create_table('party_links',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('report_party_id', sa.UUID(), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False, comment='Secure token for URL access'),
        sa.Column('expires_at', sa.DateTime(), nullable=False, comment='When this link expires'),
        sa.Column('status', sa.String(length=50), nullable=False, comment='active, used, expired, revoked'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True, comment='When party submitted their data'),
        sa.ForeignKeyConstraint(['report_party_id'], ['report_parties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_party_links_report_party_id'), 'party_links', ['report_party_id'], unique=False)
    op.create_index(op.f('ix_party_links_status'), 'party_links', ['status'], unique=False)
    op.create_index(op.f('ix_party_links_token'), 'party_links', ['token'], unique=True)

    # ### documents table ###
    op.create_table('documents',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('report_party_id', sa.UUID(), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False, comment='drivers_license, passport, state_id, other'),
        sa.Column('file_url', sa.String(length=500), nullable=False, comment='Storage URL (S3, etc.)'),
        sa.Column('file_name', sa.String(length=255), nullable=False, comment='Original filename'),
        sa.Column('mime_type', sa.String(length=100), nullable=False, comment='MIME type (image/jpeg, etc.)'),
        sa.Column('size_bytes', sa.Integer(), nullable=False, comment='File size in bytes'),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('verified_at', sa.DateTime(), nullable=True, comment='When document was verified'),
        sa.ForeignKeyConstraint(['report_party_id'], ['report_parties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_document_type'), 'documents', ['document_type'], unique=False)
    op.create_index(op.f('ix_documents_report_party_id'), 'documents', ['report_party_id'], unique=False)

    # ### audit_log table ###
    op.create_table('audit_log',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('report_id', sa.UUID(), nullable=True),
        sa.Column('actor_type', sa.String(length=50), nullable=False, comment='system, staff, party, api'),
        sa.Column('actor_user_id', sa.UUID(), nullable=True, comment='User ID if applicable'),
        sa.Column('action', sa.String(length=100), nullable=False, comment='report.created, party.submitted, document.uploaded, etc.'),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Additional action details'),
        sa.Column('ip_address', postgresql.INET(), nullable=True, comment='Client IP address'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_audit_log_action'), 'audit_log', ['action'], unique=False)
    op.create_index(op.f('ix_audit_log_actor_type'), 'audit_log', ['actor_type'], unique=False)
    op.create_index(op.f('ix_audit_log_actor_user_id'), 'audit_log', ['actor_user_id'], unique=False)
    op.create_index(op.f('ix_audit_log_created_at'), 'audit_log', ['created_at'], unique=False)
    op.create_index(op.f('ix_audit_log_report_id'), 'audit_log', ['report_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_index(op.f('ix_audit_log_report_id'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_created_at'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_actor_user_id'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_actor_type'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_action'), table_name='audit_log')
    op.drop_table('audit_log')
    
    op.drop_index(op.f('ix_documents_report_party_id'), table_name='documents')
    op.drop_index(op.f('ix_documents_document_type'), table_name='documents')
    op.drop_table('documents')
    
    op.drop_index(op.f('ix_party_links_token'), table_name='party_links')
    op.drop_index(op.f('ix_party_links_status'), table_name='party_links')
    op.drop_index(op.f('ix_party_links_report_party_id'), table_name='party_links')
    op.drop_table('party_links')
    
    op.drop_index(op.f('ix_report_parties_status'), table_name='report_parties')
    op.drop_index(op.f('ix_report_parties_report_id'), table_name='report_parties')
    op.drop_index(op.f('ix_report_parties_party_role'), table_name='report_parties')
    op.drop_table('report_parties')
    
    op.drop_index(op.f('ix_reports_status'), table_name='reports')
    op.drop_table('reports')
