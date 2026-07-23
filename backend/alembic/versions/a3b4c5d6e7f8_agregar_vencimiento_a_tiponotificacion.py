"""agregar miembresia vencimiento proximo a tiponotificacion

Revision ID: a3b4c5d6e7f8
Revises: f1e2d3c4b5a6
Create Date: 2026-07-22 23:00:00.000000

Añade el valor ``MIEMBRESIA_VENCIMIENTO_PROXIMO`` al enum PostgreSQL
``tiponotificacion`` para la tarea Celery Beat de alertas de vencimiento
de membresías (ver ``alertas_tareas.py``).

Notas técnicas (PostgreSQL):
  * ``ALTER TYPE ... ADD VALUE`` **no** puede ejecutarse dentro de un
    bloque transaccional cuando el tipo ya está en uso, así que
    envolvemos la operación con ``op.get_context().autocommit_block()``
    para que Alembic emita el ``COMMIT`` previo y ejecute fuera de
    transacción.
  * Usamos ``IF NOT EXISTS`` para que la migración sea idempotente.
"""

from alembic import op

revision = "a3b4c5d6e7f8"
down_revision = "f1e2d3c4b5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.get_context().autocommit_block()
    op.execute(
        "ALTER TYPE tiponotificacion ADD VALUE IF NOT EXISTS 'MIEMBRESIA_VENCIMIENTO_PROXIMO'"
    )


def downgrade() -> None:
    # PostgreSQL does not support removing a value from an enum type.
    # A full downgrade would require recreating the type without the value
    # and migrating all rows — out of scope for this migration.
    pass
