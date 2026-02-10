"""Add certification fields to reports

Revision ID: 20260210_000003
Revises: 20260210_000002
Create Date: 2026-02-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '20260210_000003'
down_revision = '20260210_000002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('reports', sa.Column('certification_data', JSONB, nullable=True))
    op.add_column('reports', sa.Column('certified_at', sa.DateTime, nullable=True))
    op.add_column('reports', sa.Column('certified_by_user_id', sa.String(36), nullable=True))


def downgrade():
    op.drop_column('reports', 'certified_by_user_id')
    op.drop_column('reports', 'certified_at')
    op.drop_column('reports', 'certification_data')
