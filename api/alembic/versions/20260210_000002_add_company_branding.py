"""Add company branding fields (logo, colors)

Revision ID: 20260210_000002
Revises: 20260210_000001
Create Date: 2026-02-10
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260210_000002'
down_revision = '20260210_000001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('companies', sa.Column('logo_url', sa.String(500), nullable=True))
    op.add_column('companies', sa.Column('logo_updated_at', sa.DateTime, nullable=True))
    op.add_column('companies', sa.Column('primary_color', sa.String(7), nullable=True))
    op.add_column('companies', sa.Column('secondary_color', sa.String(7), nullable=True))


def downgrade():
    op.drop_column('companies', 'secondary_color')
    op.drop_column('companies', 'primary_color')
    op.drop_column('companies', 'logo_updated_at')
    op.drop_column('companies', 'logo_url')
