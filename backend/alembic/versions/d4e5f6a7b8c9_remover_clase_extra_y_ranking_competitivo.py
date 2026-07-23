"""remover clase extra y ranking competitivo (resultados mensuales,
justificativos, reingreso, selección oficial)

Revision ID: d4e5f6a7b8c9
Revises: c4d5e6f7a8b9
Create Date: 2026-07-22 23:30:00.000000

Elimina por completo:
  - `solicitud_clase_extra` (feature "Clase Extra").
  - `resultado_ranking_mensual` y `justificativo_ranking` (funcionalidad
    competitiva del ranking: resultados mensuales, justificativos de
    ausencia, reingreso).
  - Las columnas `seleccion_oficial`/`anio_seleccion` de `ranking`
    (feature "Selección Oficial") y `meses_consecutivos_ausente` (contador
    quedaba huérfano una vez removido el reingreso/justificativos, único
    escritor).

Se conserva intacta la asignación de alumnos a niveles/grupos de
entrenamiento (`nivel_ranking`, `ranking.nivel_ranking_id`,
`ranking.esta_en_ranking`) -- no es parte de esta remoción, ver CAUTION en
el proyecto de remoción de features.

También se eliminan los tipos ENUM de PostgreSQL que quedaban huérfanos
(`estadosolicitudextra`, `estadojustificativoranking`). Los valores
`RANKING_REINGRESO_APROBADO`/`JUSTIFICATIVO_APROBADO`/`JUSTIFICATIVO_RECHAZADO`
del enum `tiponotificacion` NO se remueven de la base de datos: PostgreSQL no
soporta eliminar valores de un enum existente sin recrear el tipo y migrar
filas (ver downgrade de a3b4c5d6e7f8) -- quedan huérfanos mas inofensivos en
el ENUM de DB; el enum Python ya no los declara.

Como el enum Python ya no declara esos tres valores, cualquier fila de
`notificacion` que los tenga persistidos rompería la deserialización de
SQLAlchemy (`Enum(TipoNotificacion)` lanza `LookupError` ante un valor no
declarado) la próxima vez que se lea. Por eso este upgrade() borra las
notificaciones huérfanas antes de tocar cualquier otra cosa: son avisos de
una funcionalidad que ya no existe, no tiene sentido conservarlas.
"""
from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: str = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM notificacion WHERE tipo IN "
        "('RANKING_REINGRESO_APROBADO', 'JUSTIFICATIVO_APROBADO', 'JUSTIFICATIVO_RECHAZADO')"
    )

    op.drop_table('solicitud_clase_extra')
    op.drop_table('justificativo_ranking')
    op.drop_table('resultado_ranking_mensual')

    with op.batch_alter_table('ranking') as batch_op:
        batch_op.drop_column('seleccion_oficial')
        batch_op.drop_column('anio_seleccion')
        batch_op.drop_column('meses_consecutivos_ausente')

    op.execute('DROP TYPE IF EXISTS estadosolicitudextra')
    op.execute('DROP TYPE IF EXISTS estadojustificativoranking')


def downgrade() -> None:
    op.execute(
        "CREATE TYPE estadosolicitudextra AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA')"
    )
    op.execute(
        "CREATE TYPE estadojustificativoranking AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO')"
    )

    with op.batch_alter_table('ranking') as batch_op:
        batch_op.add_column(
            sa.Column('meses_consecutivos_ausente', sa.Integer(), nullable=False, server_default='0')
        )
        batch_op.add_column(
            sa.Column('seleccion_oficial', sa.Boolean(), nullable=False, server_default=sa.false())
        )
        batch_op.add_column(sa.Column('anio_seleccion', sa.Integer(), nullable=True))

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

    op.create_table(
        'justificativo_ranking',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('mes', sa.Integer(), nullable=False),
        sa.Column('motivo', sa.String(length=255), nullable=False),
        sa.Column('archivo_url', sa.String(length=255), nullable=True),
        sa.Column('observaciones', sa.String(length=500), nullable=True),
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

    op.create_table(
        'solicitud_clase_extra',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('fecha_clase_solicitada', sa.Date(), nullable=False),
        sa.Column(
            'estado',
            sa.Enum('PENDIENTE', 'APROBADA', 'RECHAZADA', name='estadosolicitudextra'),
            nullable=False,
        ),
        sa.Column('costo_adicional', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('fecha_solicitud', sa.DateTime(), nullable=False),
        sa.Column('observaciones', sa.String(length=255), nullable=True),
        sa.Column('persona_id', sa.Integer(), nullable=False),
        sa.Column('membresia_id', sa.Integer(), nullable=False),
        sa.Column('horario_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['horario_id'], ['horario_entrenamiento.id'], ),
        sa.ForeignKeyConstraint(['membresia_id'], ['membresia.id'], ),
        sa.ForeignKeyConstraint(['persona_id'], ['persona.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
