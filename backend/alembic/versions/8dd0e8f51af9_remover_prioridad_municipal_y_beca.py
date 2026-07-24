"""remover prioridad_municipal y beca de persona

Revision ID: 8dd0e8f51af9
Revises: d4e5f6a7b8c9
Create Date: 2026-07-23 00:00:00.000000

Elimina las columnas `prioridad_municipal`, `porcentaje_beca` y
`motivo_beca` de `persona`: la etiqueta administrativa de prioridad
municipal y el par beca/descuento (incluida la lógica de descuento
automático en `validar_pago`) se remueven por completo, no solo su UI.
"""
from alembic import op
import sqlalchemy as sa


revision: str = '8dd0e8f51af9'
down_revision: str = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('persona', schema=None) as batch_op:
        batch_op.drop_column('motivo_beca')
        batch_op.drop_column('porcentaje_beca')
        batch_op.drop_column('prioridad_municipal')


def downgrade() -> None:
    with op.batch_alter_table('persona', schema=None) as batch_op:
        batch_op.add_column(sa.Column('prioridad_municipal', sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column('porcentaje_beca', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('motivo_beca', sa.String(length=150), nullable=True))
