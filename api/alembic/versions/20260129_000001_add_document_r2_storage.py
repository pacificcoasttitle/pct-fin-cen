"""Add R2 storage fields to documents table

Revision ID: 20260129_000001
Revises: 20260127_000001
Create Date: 2026-01-29

Adds support for Cloudflare R2 storage:
- storage_key: R2 object key path
- upload_confirmed: Confirmation of successful upload
- description: Optional user description
- created_at: Separate from uploaded_at
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260129_000001'
down_revision = '20260127_000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add R2 storage key column
    op.add_column('documents', sa.Column(
        'storage_key', 
        sa.String(length=500), 
        nullable=True,
        comment='R2 object key path (company/report/party/type/uuid.ext)'
    ))
    
    # Add upload confirmation flag
    op.add_column('documents', sa.Column(
        'upload_confirmed', 
        sa.Boolean(), 
        nullable=False,
        server_default='false',
        comment='True when client confirms successful R2 upload'
    ))
    
    # Add optional description
    op.add_column('documents', sa.Column(
        'description', 
        sa.String(length=255), 
        nullable=True,
        comment='Optional user-provided description'
    ))
    
    # Add created_at separate from uploaded_at
    op.add_column('documents', sa.Column(
        'created_at', 
        sa.DateTime(), 
        nullable=True,
        server_default=sa.text('now()'),
        comment='Record creation timestamp'
    ))
    
    # Make file_url nullable (now using storage_key)
    op.alter_column('documents', 'file_url',
        existing_type=sa.String(length=500),
        nullable=True
    )
    
    # Make size_bytes nullable (set after upload confirmation)
    op.alter_column('documents', 'size_bytes',
        existing_type=sa.Integer(),
        nullable=True
    )
    
    # Make uploaded_at nullable (set when upload confirmed)
    op.alter_column('documents', 'uploaded_at',
        existing_type=sa.DateTime(),
        nullable=True
    )
    
    # Create index on storage_key
    op.create_index(
        'ix_documents_storage_key', 
        'documents', 
        ['storage_key'], 
        unique=True
    )


def downgrade() -> None:
    # Drop index
    op.drop_index('ix_documents_storage_key', table_name='documents')
    
    # Remove new columns
    op.drop_column('documents', 'created_at')
    op.drop_column('documents', 'description')
    op.drop_column('documents', 'upload_confirmed')
    op.drop_column('documents', 'storage_key')
    
    # Restore NOT NULL constraints
    op.alter_column('documents', 'uploaded_at',
        existing_type=sa.DateTime(),
        nullable=False
    )
    op.alter_column('documents', 'size_bytes',
        existing_type=sa.Integer(),
        nullable=False
    )
    op.alter_column('documents', 'file_url',
        existing_type=sa.String(length=500),
        nullable=False
    )
