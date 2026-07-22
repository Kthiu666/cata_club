"""merge alumno_horario y observaciones_justificativo heads

Revision ID: 0756dd06d542
Revises: b2c3d4e5f6a7, e41f2a9b7c8d
Create Date: 2026-07-22 08:31:10.651649

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0756dd06d542'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a7', 'e41f2a9b7c8d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
