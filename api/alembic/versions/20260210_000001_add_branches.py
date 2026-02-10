"""Add branches table and user branch association

Revision ID: 20260210_000001
Revises: 20260209_000001
Create Date: 2026-02-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '20260210_000001'
down_revision = '20260209_000001'
branch_labels = None
depends_on = None


def upgrade():
    # Create branches table
    op.create_table(
        'branches',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('code', sa.String(50), nullable=True),
        sa.Column('street', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(50), nullable=True),
        sa.Column('zip', sa.String(20), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('manager_name', sa.String(255), nullable=True),
        sa.Column('manager_email', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column('is_headquarters', sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # Index on company_id for fast lookup
    op.create_index('ix_branches_company_id', 'branches', ['company_id'])

    # Add branch_id to users table
    op.add_column('users', sa.Column('branch_id', UUID(as_uuid=True), sa.ForeignKey('branches.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_users_branch_id', 'users', ['branch_id'])


def downgrade():
    op.drop_index('ix_users_branch_id', table_name='users')
    op.drop_column('users', 'branch_id')
    op.drop_index('ix_branches_company_id', table_name='branches')
    op.drop_table('branches')
