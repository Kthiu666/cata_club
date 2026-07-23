"""agrega categoria a horario_entrenamiento

Revision ID: b7f3c1a9d2e4
Revises: 0756dd06d542
Create Date: 2026-07-22 00:00:00.000000

Agrega la columna `categoria` (5 valores fijos de negocio: FORMATIVO,
INFANTIL, JUVENIL, COMPETITIVO, ADULTOS -- ver
`app.dominio.categoria_metadata.CATEGORIA_METADATA`) a `horario_entrenamiento`.

Se agrega nullable, se rellena (backfill) mapeando por `hora_inicio` contra
las 5 franjas horarias canónicas conocidas, y luego se vuelve NOT NULL: todo
horario existente en cualquier ambiente ya sembrado debe pertenecer a una
de las 5 categorías (no hay UI/flujo que cree horarios fuera de estas 5
franjas antes de este cambio).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7f3c1a9d2e4'
down_revision: Union[str, Sequence[str], None] = '0756dd06d542'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_CATEGORIA_POR_HORA_INICIO = {
    "15:00:00": "FORMATIVO",
    "16:00:00": "INFANTIL",
    "17:00:00": "JUVENIL",
    "18:00:00": "COMPETITIVO",
    "20:00:00": "ADULTOS",
}


def categoria_para_hora_inicio(hora_inicio) -> str:
    """Mapea `hora_inicio` a su `categoria` de negocio para el backfill.

    Sin fallback silencioso: una `hora_inicio` que no coincide con ninguna
    de las 5 franjas canónicas conocidas no puede backfillearse a ciegas y
    debe fallar ruidosamente para que se investigue el dato antes de migrar.
    """
    clave = hora_inicio.strftime("%H:%M:%S") if hasattr(hora_inicio, "strftime") else str(hora_inicio)
    if clave not in _CATEGORIA_POR_HORA_INICIO:
        raise ValueError(
            f"No se puede mapear hora_inicio={clave!r} a ninguna categoria "
            f"conocida ({sorted(_CATEGORIA_POR_HORA_INICIO)}); revisar los "
            "datos de horario_entrenamiento antes de aplicar esta migración."
        )
    return _CATEGORIA_POR_HORA_INICIO[clave]


def upgrade() -> None:
    """Upgrade schema."""
    sa.Enum(
        'FORMATIVO', 'INFANTIL', 'JUVENIL', 'COMPETITIVO', 'ADULTOS',
        name='categoria',
    ).create(op.get_bind(), checkfirst=True)

    with op.batch_alter_table('horario_entrenamiento', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'categoria',
                sa.Enum('FORMATIVO', 'INFANTIL', 'JUVENIL', 'COMPETITIVO', 'ADULTOS', name='categoria'),
                nullable=True,
            )
        )

    # --- Backfill: mapear categoria a partir de hora_inicio -------------------
    # Raw UPDATE with an explicit `::categoria` cast — psycopg3 binds a Python
    # str parameter as VARCHAR by default, and Postgres does not implicitly
    # cast VARCHAR to a custom enum type, so relying on SQLAlchemy Core's
    # `.values(categoria=...)` (even with the column declared as `sa.Enum`)
    # still emits `categoria=$1::VARCHAR` and fails with DatatypeMismatch.
    bind = op.get_bind()
    horario_tabla = sa.table(
        'horario_entrenamiento',
        sa.column('id', sa.Integer),
        sa.column('hora_inicio', sa.Time),
    )
    filas = bind.execute(sa.select(horario_tabla.c.id, horario_tabla.c.hora_inicio)).fetchall()
    for fila_id, hora_inicio in filas:
        bind.execute(
            sa.text("UPDATE horario_entrenamiento SET categoria = :categoria ::categoria WHERE id = :id"),
            {"categoria": categoria_para_hora_inicio(hora_inicio), "id": fila_id},
        )

    with op.batch_alter_table('horario_entrenamiento', schema=None) as batch_op:
        batch_op.alter_column('categoria', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('horario_entrenamiento', schema=None) as batch_op:
        batch_op.drop_column('categoria')
    sa.Enum(name='categoria').drop(op.get_bind(), checkfirst=True)
