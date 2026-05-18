"""Add checkin_window_open to cycles

Revision ID: 002
Revises: 001
Create Date: 2026-05-18

"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('cycles', sa.Column('checkin_window_open', sa.Boolean(), default=False))

def downgrade() -> None:
    op.drop_column('cycles', 'checkin_window_open')