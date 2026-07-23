"""agregar representante al enum tiporol

Revision ID: f1e2d3c4b5a6
Revises: 0756dd06d542
Create Date: 2026-07-22 22:00:00.000000

Añade el valor ``REPRESENTANTE`` al enum PostgreSQL ``tiporol`` que ya
contiene ``ALUMNO``, ``ENTRENADOR`` y ``ADMINISTRADOR`` (ver migración
base ``c8722261ea5b``). ``REPRESENTANTE`` pasa a ser un rol de primer
nivel para el módulo de roles del backend (ver enums.py), sustituyendo
al antiguo ``TESORERO`` que se retiró del esquema en ``a555ea3``.

Notas técnicas (PostgreSQL):
  * ``ALTER TYPE ... ADD VALUE`` **no** puede ejecutarse dentro de un
    bloque transaccional cuando el tipo ya está en uso, así que
    envolvemos la operación con ``op.get_context().autocommit_block()``
    para que Alembic emita el ``COMMIT`` previo y ejecute fuera de
    transacción.
  * Usamos ``IF NOT EXISTS`` para que la migración sea idempotente y no
    falle si se aplica sobre una base ya migrada.
  * El ``downgrade`` es destructivo: PostgreSQL no soporta
    ``ALTER TYPE ... DROP VALUE``. Se recrea el tipo ``tiporol`` sin
    ``REPRESENTANTE`` previa reasignación de filas existentes en
    ``rol.tipo_rol`` a ``ALUMNO`` (rol mínimo garantizado) para no
    violar la constraint del enum.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1e2d3c4b5a6'
down_revision: Union[str, Sequence[str], None] = '0756dd06d542'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Añadir REPRESENTANTE al enum tiporol de PostgreSQL."""
    # ALTER TYPE ... ADD VALUE no puede vivir dentro de una transacción
    # cuando el tipo ya está en uso: autocommit_block Commit-iza la
    # transacción actual y ejecuta el DDL fuera de ella.
    op.get_context().autocommit_block()
    op.execute("ALTER TYPE tiporol ADD VALUE IF NOT EXISTS 'REPRESENTANTE'")


def downgrade() -> None:
    """Revertir: eliminar REPRESENTANTE del enum tiporol.

    PostgreSQL no soporta ``ALTER TYPE ... DROP VALUE``, así que se
    recrea el tipo ``tiporol`` con los 3 valores originales. Previo a
    esto, cualquier fila en ``rol.tipo_rol='REPRESENTANTE'`` se
    reasigna a ``ALUMNO`` (rol mínimo garantizado en el esquema) para
    no violar la constraint del enum al reinterpretar la columna.
    """
    op.execute("UPDATE rol SET tipo_rol = 'ALUMNO' WHERE tipo_rol = 'REPRESENTANTE'")

    op.execute("ALTER TYPE tiporol RENAME TO tiporol_old")
    sa.Enum(
        'ALUMNO', 'ENTRENADOR', 'ADMINISTRADOR',
        name='tiporol',
    ).create(op.get_bind(), checkfirst=False)
    op.execute(
        "ALTER TABLE rol ALTER COLUMN tipo_rol TYPE tiporol "
        "USING tipo_rol::text::tiporol"
    )
    sa.Enum(name='tiporol_old').drop(op.get_bind(), checkfirst=False)
