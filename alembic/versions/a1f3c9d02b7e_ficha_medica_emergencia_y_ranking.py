"""ficha médica: datos de emergencia + módulo de ranking (E03)

Revision ID: a1f3c9d02b7e
Revises: c8722261ea5b
Create Date: 2026-07-14 00:00:00.000000

Cubre lo acordado en la integración con el frontend:
  - FichaMedica: se agregan alergias / contacto_emergencia / telefono_emergencia.
  - Nuevo módulo de Ranking (E03): nivel_ranking (= grupo de entrenamiento,
    ver docstring de NivelRanking en app/dominio/modelos.py), extensión de
    Ranking, resultado_ranking_mensual, justificativo_ranking, notificacion.
  - horario_entrenamiento gana nivel_ranking_id (nullable).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1f3c9d02b7e'
down_revision: Union[str, Sequence[str], None] = 'c8722261ea5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # --- Fase 0: FichaMedica -- datos de emergencia --------------------------
    op.add_column('ficha_medica', sa.Column('alergias', sa.String(length=255), nullable=True))
    op.add_column('ficha_medica', sa.Column('contacto_emergencia', sa.String(length=150), nullable=True))
    op.add_column('ficha_medica', sa.Column('telefono_emergencia', sa.String(length=15), nullable=True))

    # --- Fase 5: NivelRanking (= grupo de entrenamiento) ---------------------
    op.create_table(
        'nivel_ranking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('numero_nivel', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=80), nullable=True),
        sa.Column('capacidad_minima', sa.Integer(), nullable=False, server_default='6'),
        sa.Column('capacidad_maxima', sa.Integer(), nullable=False, server_default='10'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero_nivel'),
    )

    # horario_entrenamiento: FK opcional al nivel de ranking que agrupa.
    # batch_alter_table: SQLite (usado en los tests) no soporta ALTER de
    # constraints directamente; batch mode funciona igual en PostgreSQL
    # (motor real de producción), así que es portable para ambos.
    with op.batch_alter_table('horario_entrenamiento') as batch_op:
        batch_op.add_column(sa.Column('nivel_ranking_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_horario_entrenamiento_nivel_ranking', 'nivel_ranking',
            ['nivel_ranking_id'], ['id'],
        )

    # ranking: se extiende con nivel operativo, contador de ausencias y
    # selección oficial.
    with op.batch_alter_table('ranking') as batch_op:
        batch_op.add_column(sa.Column('nivel_ranking_id', sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column('meses_consecutivos_ausente', sa.Integer(), nullable=False, server_default='0')
        )
        batch_op.add_column(
            sa.Column('seleccion_oficial', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column('anio_seleccion', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_ranking_nivel_ranking', 'nivel_ranking', ['nivel_ranking_id'], ['id'],
        )

    # resultado_ranking_mensual: histórico mes a mes (RF003/RF004/RF007).
    op.create_table(
        'resultado_ranking_mensual',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('mes', sa.Integer(), nullable=False),
        sa.Column('posicion', sa.Integer(), nullable=True),
        sa.Column('puntos_obtenidos', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('participo', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('ausencia_justificada', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('fecha_registro', sa.DateTime(), nullable=False),
        sa.Column('persona_id', sa.Integer(), nullable=False),
        sa.Column('nivel_ranking_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['persona_id'], ['persona.id'], ),
        sa.ForeignKeyConstraint(['nivel_ranking_id'], ['nivel_ranking.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('persona_id', 'anio', 'mes', name='uq_resultado_ranking_persona_periodo'),
    )

    # justificativo_ranking (RF006a/RF006b).
    op.create_table(
        'justificativo_ranking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('mes', sa.Integer(), nullable=False),
        sa.Column('motivo', sa.String(length=255), nullable=False),
        sa.Column('archivo_url', sa.String(length=255), nullable=True),
        sa.Column(
            'estado',
            sa.Enum('PENDIENTE', 'APROBADO', 'RECHAZADO', name='estadojustificativoranking'),
            nullable=False,
        ),
        sa.Column('motivo_rechazo', sa.String(length=255), nullable=True),
        sa.Column('fecha_solicitud', sa.DateTime(), nullable=False),
        sa.Column('fecha_evaluacion', sa.DateTime(), nullable=True),
        sa.Column('persona_id', sa.Integer(), nullable=False),
        sa.Column('evaluado_por_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['persona_id'], ['persona.id'], ),
        sa.ForeignKeyConstraint(['evaluado_por_id'], ['persona.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('persona_id', 'anio', 'mes', name='uq_justificativo_persona_periodo'),
    )

    # notificacion (in-app, RF005/RF007/RF009 + evaluación de justificativos).
    op.create_table(
        'notificacion',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column(
            'tipo',
            sa.Enum(
                'RANKING_ELIMINACION_PROXIMA', 'RANKING_ASCENSO_SUGERIDO',
                'RANKING_DESCENSO_SUGERIDO', 'RANKING_REINGRESO_APROBADO',
                'JUSTIFICATIVO_APROBADO', 'JUSTIFICATIVO_RECHAZADO',
                name='tiponotificacion',
            ),
            nullable=False,
        ),
        sa.Column('mensaje', sa.String(length=255), nullable=False),
        sa.Column('leida', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False),
        sa.Column('entidad_relacionada_id', sa.Integer(), nullable=True),
        sa.Column('persona_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['persona_id'], ['persona.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('notificacion')
    op.drop_table('justificativo_ranking')
    op.drop_table('resultado_ranking_mensual')

    with op.batch_alter_table('ranking') as batch_op:
        batch_op.drop_constraint('fk_ranking_nivel_ranking', type_='foreignkey')
        batch_op.drop_column('anio_seleccion')
        batch_op.drop_column('seleccion_oficial')
        batch_op.drop_column('meses_consecutivos_ausente')
        batch_op.drop_column('nivel_ranking_id')

    with op.batch_alter_table('horario_entrenamiento') as batch_op:
        batch_op.drop_constraint('fk_horario_entrenamiento_nivel_ranking', type_='foreignkey')
        batch_op.drop_column('nivel_ranking_id')

    op.drop_table('nivel_ranking')

    op.drop_column('ficha_medica', 'telefono_emergencia')
    op.drop_column('ficha_medica', 'contacto_emergencia')
    op.drop_column('ficha_medica', 'alergias')

    # Enums de Postgres: hay que borrarlos explícitamente en el downgrade
    # (a diferencia de SQLite, que no los materializa como tipos aparte).
    sa.Enum(name='tiponotificacion').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='estadojustificativoranking').drop(op.get_bind(), checkfirst=True)
