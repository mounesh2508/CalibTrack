"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='TECHNICIAN'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. equipment
    op.create_table(
        'equipment',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('equipment_code', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('manufacturer', sa.String(length=100), nullable=True),
        sa.Column('model_number', sa.String(length=100), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('location', sa.String(length=150), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('calibration_interval_days', sa.Integer(), nullable=False, server_default='180'),
        sa.Column('last_calibration_date', sa.Date(), nullable=True),
        sa.Column('next_calibration_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='CALIBRATED'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_equipment_equipment_code', 'equipment', ['equipment_code'], unique=True)
    op.create_index('ix_equipment_name', 'equipment', ['name'])
    op.create_index('ix_equipment_category', 'equipment', ['category'])
    op.create_index('ix_equipment_serial_number', 'equipment', ['serial_number'])
    op.create_index('ix_equipment_status', 'equipment', ['status'])
    op.create_index('ix_equipment_next_calibration_date', 'equipment', ['next_calibration_date'])

    # 3. calibration_records
    op.create_table(
        'calibration_records',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('equipment_id', sa.String(length=36), sa.ForeignKey('equipment.id', ondelete='CASCADE'), nullable=False),
        sa.Column('calibration_date', sa.Date(), nullable=False),
        sa.Column('next_due_date', sa.Date(), nullable=False),
        sa.Column('performed_by', sa.String(length=150), nullable=True),
        sa.Column('calibration_provider', sa.String(length=150), nullable=True),
        sa.Column('certificate_number', sa.String(length=100), nullable=True),
        sa.Column('result', sa.String(length=50), nullable=False, server_default='PASSED'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('certificate_file_path', sa.String(length=255), nullable=True),
        sa.Column('created_by', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_calibration_records_equipment_id', 'calibration_records', ['equipment_id'])
    op.create_index('ix_calibration_records_calibration_date', 'calibration_records', ['calibration_date'])
    op.create_index('ix_calibration_records_certificate_number', 'calibration_records', ['certificate_number'])

    # 4. notifications
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('equipment_id', sa.String(length=36), sa.ForeignKey('equipment.id', ondelete='CASCADE'), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_equipment_id', 'notifications', ['equipment_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])

    # 5. reminder_settings
    op.create_table(
        'reminder_settings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('reminder_days_before', sa.Integer(), nullable=False, server_default='7'),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('in_app_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

def downgrade() -> None:
    op.drop_table('reminder_settings')
    op.drop_table('notifications')
    op.drop_table('calibration_records')
    op.drop_table('equipment')
    op.drop_table('users')
