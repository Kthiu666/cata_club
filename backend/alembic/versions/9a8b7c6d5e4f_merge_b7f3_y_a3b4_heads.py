"""merge b7f3 categoria horario y a3b4 vencimiento tiponotificacion heads

Revision ID: 9a8b7c6d5e4f
Revises: b7f3c1a9d2e4, a3b4c5d6e7f8
Create Date: 2026-07-22 23:30:00.000000

Unifica las dos cabezas que se abrieron después del merge 0756dd06d542:
  - b7f3c1a9d2e4 (categoria a horario_entrenamiento, rama post-merge)
  - a3b4c5d6e7f8 (vencimiento a tiponotificacion, hijo de f1e2d3c4b5a6)

Nodo vacío: no aplica DDL, solo junta las dos ramas en una sola head
para que `alembic upgrade head` sea determinista (una única cabeza).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a8b7c6d5e4f'
down_revision: Union[str, Sequence[str], None] = ('b7f3c1a9d2e4', 'a3b4c5d6e7f8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
