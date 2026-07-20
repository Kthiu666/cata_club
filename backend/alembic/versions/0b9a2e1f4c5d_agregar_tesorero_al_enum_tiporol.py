"""agregar TESORERO al enum tiporol de PostgreSQL

Revision ID: 0b9a2e1f4c5d
Revises: d3bc8c020e36
Create Date: 2026-07-20 00:00:00.000000

Issue #6 — gap 1: QA encontró que el enum `tiporol` de PostgreSQL no tiene
el valor TESORERO. El enum Python (TipoRol) ya lo incluye (ver enums.py), y
el código de la tesoreria_router.py ya usa el string "TESORERO" en sus
GestorPermisos — pero al insertar un rol con ese valor en la DB falla porque
el enum postgres no lo reconoce.

Esta migración agrega TESORERO al enum existente mediante ALTER TYPE ... ADD
VALUE (operación O(1) en PostgreSQL que no reescribe las tablas).
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0b9a2e1f4c5d"
down_revision: Union[str, Sequence[str], None] = "d3bc8c020e36"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE es DDL transaccional en PostgreSQL 12+.
    # Debe ejecutarse fuera de una transacción de migración; Alembic lo maneja
    # automáticamente con op.execute() (no usa el bloque de transacción).
    op.execute("ALTER TYPE tiporol ADD VALUE 'TESORERO'")


def downgrade() -> None:
    # PostgreSQL no permite remover un valor de un enum sin recrearlo.
    # Esta migración es one-way forward; si se necesita downgrade, habría que
    # recrear el tipo sin TESORERO (ALTER TYPE ... RENAME TO + CREATE + ALTER
    # COLUMN), pero no implementamos el downgrade porque es un valor agregado
    # que no afecta datos existentes (no se usaba antes de esta migración).
    pass
