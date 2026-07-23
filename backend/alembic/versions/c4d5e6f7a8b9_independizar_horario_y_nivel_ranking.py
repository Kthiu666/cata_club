"""independizar_horario_y_nivel_ranking

Revision ID: c4d5e6f7a8b9
Revises: 9a8b7c6d5e4f
Create Date: 2026-07-22 23:45:00.000000

Elimina la columna `nivel_ranking_id` y su FK de `horario_entrenamiento`.

Horario y nivel de ranking son INDEPENDIENTES: un alumno puede estar en un
horario y un nivel asignado, mientras que otro alumno puede estar en el
mismo horario pero otro nivel. El nivel de cada alumno vive exclusivamente
en `Ranking.nivel_ranking_id`, no en el horario.

Downgrade: reemplaza la columna como nullable (no podemos saber qué nivel
tenía cada horario antes de la eliminación, así que se vuelve nullable).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, Sequence[str], None] = '9a8b7c6d5e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # FK nombrada `fk_horario_entrenamiento_nivel_ranking` en la migración
    # original (a1f3c9d02b7e) sobre `horario_entrenamiento` — no
    # `fk_ranking_nivel_ranking`, que es la FK homónima sobre `ranking`.
    op.drop_constraint(
        "fk_horario_entrenamiento_nivel_ranking",
        "horario_entrenamiento",
        type_="foreignkey",
    )
    op.drop_column("horario_entrenamiento", "nivel_ranking_id")


def downgrade() -> None:
    op.add_column(
        "horario_entrenamiento",
        sa.Column("nivel_ranking_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_horario_entrenamiento_nivel_ranking",
        "horario_entrenamiento",
        "nivel_ranking",
        ["nivel_ranking_id"],
        ["id"],
    )
