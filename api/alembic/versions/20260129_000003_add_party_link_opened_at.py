"""Add opened_at column to party_links table

Revision ID: 20260129_000003
Revises: 20260129_000002
Create Date: 2026-01-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260129_000003'
down_revision: Union[str, None] = '20260129_000002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add opened_at column to track when party links are first accessed."""
    op.add_column(
        'party_links',
        sa.Column('opened_at', sa.DateTime(), nullable=True, comment='When party first opened the link')
    )


def downgrade() -> None:
    """Remove opened_at column."""
    op.drop_column('party_links', 'opened_at')
