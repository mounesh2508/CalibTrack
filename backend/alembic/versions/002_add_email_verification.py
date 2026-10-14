"""add email verification columns to users table

Revision ID: 002_add_email_verification
Revises: 001_initial_schema
Create Date: 2026-10-14 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_add_email_verification'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]

    if 'is_email_verified' not in columns:
        op.add_column('users', sa.Column('is_email_verified', sa.Boolean(), nullable=False, server_default=sa.false()))
    if 'email_verification_token' not in columns:
        op.add_column('users', sa.Column('email_verification_token', sa.String(length=255), nullable=True))
        op.create_index('ix_users_email_verification_token', 'users', ['email_verification_token'])
    if 'email_verification_token_expires_at' not in columns:
        op.add_column('users', sa.Column('email_verification_token_expires_at', sa.DateTime(), nullable=True))
    if 'last_verification_email_sent_at' not in columns:
        op.add_column('users', sa.Column('last_verification_email_sent_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]

    if 'last_verification_email_sent_at' in columns:
        op.drop_column('users', 'last_verification_email_sent_at')
    if 'email_verification_token_expires_at' in columns:
        op.drop_column('users', 'email_verification_token_expires_at')
    if 'email_verification_token' in columns:
        op.drop_index('ix_users_email_verification_token', table_name='users')
        op.drop_column('users', 'email_verification_token')
    if 'is_email_verified' in columns:
        op.drop_column('users', 'is_email_verified')
