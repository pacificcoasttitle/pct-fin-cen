"""add determination fields to report

Revision ID: 20260209_000001
Revises: 20260208_000001
Create Date: 2026-02-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260209_000001'
down_revision = '20260208_000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add determination persistence fields to reports table
    op.add_column('reports', sa.Column('determination_result', sa.String(50), nullable=True,
                                        comment='exempt or reportable'))
    op.add_column('reports', sa.Column('exemption_certificate_id', sa.String(100), nullable=True,
                                        comment='Stable exemption certificate ID'))
    op.add_column('reports', sa.Column('exemption_reasons',
                                        postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                                        comment='e.g. ["buyer_is_individual", "financing_involved"]'))
    op.add_column('reports', sa.Column('determination_completed_at', sa.DateTime(), nullable=True,
                                        comment='When determination was completed'))


def downgrade() -> None:
    op.drop_column('reports', 'determination_completed_at')
    op.drop_column('reports', 'exemption_reasons')
    op.drop_column('reports', 'exemption_certificate_id')
    op.drop_column('reports', 'determination_result')
