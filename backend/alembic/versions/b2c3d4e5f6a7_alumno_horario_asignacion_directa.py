"""asignación directa alumno ↔ horario

Revision ID: b2c3d4e5f6a7
Revises: a1f3c9d02b7e
Create Date: 2026-07-21 00:00:00.000000

Crea la tabla de asociación alumno_horario para permitir asignar
alumnos a horarios de forma directa e independiente de su nivel.
Esto permite que dos alumnos en el mismo nivel asistan a horarios distintos.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1f3c9d02b7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'alumno_horario',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('persona_id', sa.Integer(), nullable=False),
        sa.Column('horario_id', sa.Integer(), nullable=False),
        sa.Column('fecha_asignacion', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['persona_id'], ['persona.id']),
        sa.ForeignKeyConstraint(['horario_id'], ['horario_entrenamiento.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('persona_id', 'horario_id', name='uq_alumno_horario'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('alumno_horario')
