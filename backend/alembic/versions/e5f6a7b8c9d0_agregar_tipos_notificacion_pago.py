"""agregar tipos notificacion pago

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-07-23
"""
from alembic import op

revision = "e5f6a7b8c9d0"
down_revision = "8dd0e8f51af9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE tiponotificacion ADD VALUE IF NOT EXISTS 'PAGO_APROBADO'")
    op.execute("ALTER TYPE tiponotificacion ADD VALUE IF NOT EXISTS 'PAGO_RECHAZADO'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type.
    # A full migration would require creating a new enum, migrating data,
    # dropping the old column, renaming. Not worth the risk for dev data.
    pass
