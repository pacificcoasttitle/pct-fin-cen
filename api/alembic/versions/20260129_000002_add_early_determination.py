"""add early determination fields to submission_requests

Revision ID: 20260129_000002
Revises: 20260129_000001
Create Date: 2026-01-29 00:00:02.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260129_000002'
down_revision = '20260129_000001'
branch_labels = None
depends_on = None


def upgrade():
    # Add determination fields to submission_requests
    op.add_column('submission_requests', 
        sa.Column('determination_result', sa.String(50), nullable=True,
                  comment='exempt, reportable, needs_review, or null if not yet determined'))
    op.add_column('submission_requests', 
        sa.Column('exemption_reasons', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  comment='List of exemption reason codes'))
    op.add_column('submission_requests', 
        sa.Column('determination_timestamp', sa.DateTime, nullable=True,
                  comment='When determination was made'))
    op.add_column('submission_requests', 
        sa.Column('determination_method', sa.String(50), nullable=True,
                  comment='auto_client_form, staff_manual, ai_assisted'))
    op.add_column('submission_requests', 
        sa.Column('exemption_certificate_id', sa.String(100), nullable=True,
                  comment='Unique certificate number for exempt transactions'))
    op.add_column('submission_requests', 
        sa.Column('exemption_certificate_generated_at', sa.DateTime, nullable=True,
                  comment='When certificate was generated'))
    
    # Add additional form fields for determination
    op.add_column('submission_requests',
        sa.Column('property_type', sa.String(50), nullable=True,
                  comment='single_family, condo, commercial, land, etc.'))
    op.add_column('submission_requests',
        sa.Column('entity_subtype', sa.String(50), nullable=True,
                  comment='llc, corporation, public_company, bank, nonprofit, etc.'))
    
    # Add index for certificate lookup
    op.create_index('ix_submission_requests_exemption_certificate_id', 
        'submission_requests', ['exemption_certificate_id'], unique=True)
    
    # Add index for determination filtering
    op.create_index('ix_submission_requests_determination_result',
        'submission_requests', ['determination_result'])


def downgrade():
    op.drop_index('ix_submission_requests_determination_result', table_name='submission_requests')
    op.drop_index('ix_submission_requests_exemption_certificate_id', table_name='submission_requests')
    op.drop_column('submission_requests', 'entity_subtype')
    op.drop_column('submission_requests', 'property_type')
    op.drop_column('submission_requests', 'exemption_certificate_generated_at')
    op.drop_column('submission_requests', 'exemption_certificate_id')
    op.drop_column('submission_requests', 'determination_method')
    op.drop_column('submission_requests', 'determination_timestamp')
    op.drop_column('submission_requests', 'exemption_reasons')
    op.drop_column('submission_requests', 'determination_result')
