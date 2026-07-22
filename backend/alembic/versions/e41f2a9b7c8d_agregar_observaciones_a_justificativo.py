"""agregar_observaciones_a_justificativo

Revision ID: e41f2a9b7c8d
Revises: d3bc8c020e36
Create Date: 2026-07-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e41f2a9b7c8d'
down_revision: Union[str, None] = 'd3bc8c020e36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "justificativo_ranking",
        sa.Column("observaciones", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("justificativo_ranking", "observaciones")
