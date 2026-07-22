from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.dominio.modelos import (
    NivelRanking, Ranking, ResultadoRankingMensual,
    JustificativoRanking, Notificacion,
)


class NivelRankingRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, nivel_id: int) -> Optional[NivelRanking]:
        return self.db.get(NivelRanking, nivel_id)

    def obtener_por_numero(self, numero_nivel: int) -> Optional[NivelRanking]:
        return self.db.query(NivelRanking).filter(NivelRanking.numero_nivel == numero_nivel).first()

    def listar(self) -> list[NivelRanking]:
        return self.db.query(NivelRanking).order_by(NivelRanking.numero_nivel).all()

    def contar_personas_en_nivel(self, nivel_id: int) -> int:
        return (
            self.db.query(Ranking)
            .filter(Ranking.nivel_ranking_id == nivel_id, Ranking.esta_en_ranking.is_(True))
            .count()
        )

    def crear(self, nivel: NivelRanking) -> NivelRanking:
        self.db.add(nivel)
        self.db.commit()
        self.db.refresh(nivel)
        return nivel


class RankingRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, ranking_id: int) -> Optional[Ranking]:
        return self.db.get(Ranking, ranking_id)

    def obtener_por_persona(self, persona_id: int) -> Optional[Ranking]:
        return self.db.query(Ranking).filter(Ranking.persona_id == persona_id).first()

    def listar_todos(self, solo_activos: bool = True) -> list[Ranking]:
        stmt = (
            select(Ranking)
            .options(joinedload(Ranking.persona), joinedload(Ranking.nivel_ranking))
        )
        if solo_activos:
            stmt = stmt.where(Ranking.esta_en_ranking.is_(True))
        stmt = stmt.order_by(Ranking.persona_id)
        return list(self.db.execute(stmt).scalars().unique().all())

    def listar_por_nivel(self, nivel_id: int, solo_activos: bool = True) -> list[Ranking]:
        """Roster de un nivel. Ordena por `persona_id` (determinístico) --
        antes ordenaba por `posicion_actual`, pero ese campo quedó congelado
        en NULL para todas las filas desde que se removió `cerrar_mes()`
        (slice B2), así que el `ORDER BY` ya no discriminaba nada (equivalente
        a orden no determinístico dependiente del motor de DB). Ver slice E."""
        stmt = (
            select(Ranking)
            .options(joinedload(Ranking.persona))
            .where(Ranking.nivel_ranking_id == nivel_id)
        )
        if solo_activos:
            stmt = stmt.where(Ranking.esta_en_ranking.is_(True))
        stmt = stmt.order_by(Ranking.persona_id.asc())
        return list(self.db.execute(stmt).scalars().all())

    def crear(self, ranking: Ranking) -> Ranking:
        self.db.add(ranking)
        self.db.commit()
        self.db.refresh(ranking)
        return ranking

    def guardar_cambios(self, ranking: Ranking) -> Ranking:
        self.db.commit()
        self.db.refresh(ranking)
        return ranking

    def listar_seleccion_oficial(self, anio: int | None = None) -> list[Ranking]:
        stmt = (
            select(Ranking)
            .options(joinedload(Ranking.persona))
            .where(Ranking.seleccion_oficial.is_(True))
        )
        if anio is not None:
            stmt = stmt.where(Ranking.anio_seleccion == anio)
        stmt = stmt.order_by(Ranking.persona_id)
        return list(self.db.execute(stmt).scalars().unique().all())


class ResultadoRankingMensualRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener(self, persona_id: int, anio: int, mes: int) -> Optional[ResultadoRankingMensual]:
        return (
            self.db.query(ResultadoRankingMensual)
            .filter(
                ResultadoRankingMensual.persona_id == persona_id,
                ResultadoRankingMensual.anio == anio,
                ResultadoRankingMensual.mes == mes,
            )
            .first()
        )

    def listar_por_nivel_y_periodo(
        self, nivel_id: int, anio: int, mes: int
    ) -> list[ResultadoRankingMensual]:
        return (
            self.db.query(ResultadoRankingMensual)
            .options(
                joinedload(ResultadoRankingMensual.persona),
                joinedload(ResultadoRankingMensual.nivel_ranking),
            )
            .filter(
                ResultadoRankingMensual.nivel_ranking_id == nivel_id,
                ResultadoRankingMensual.anio == anio,
                ResultadoRankingMensual.mes == mes,
            )
            .all()
        )

    def listar_por_nivel(self, nivel_id: int) -> list[ResultadoRankingMensual]:
        return (
            self.db.query(ResultadoRankingMensual)
            .options(joinedload(ResultadoRankingMensual.persona))
            .filter(ResultadoRankingMensual.nivel_ranking_id == nivel_id)
            .order_by(ResultadoRankingMensual.anio.desc(), ResultadoRankingMensual.mes.desc())
            .all()
        )

    def listar_todos(self) -> list[ResultadoRankingMensual]:
        return (
            self.db.query(ResultadoRankingMensual)
            .options(
                joinedload(ResultadoRankingMensual.persona),
                joinedload(ResultadoRankingMensual.nivel_ranking),
            )
            .order_by(
                ResultadoRankingMensual.anio.desc(),
                ResultadoRankingMensual.mes.desc(),
            )
            .all()
        )

    def crear(self, resultado: ResultadoRankingMensual) -> ResultadoRankingMensual:
        self.db.add(resultado)
        self.db.commit()
        self.db.refresh(resultado)
        return resultado

    def guardar_cambios(self, resultado: ResultadoRankingMensual) -> ResultadoRankingMensual:
        self.db.commit()
        self.db.refresh(resultado)
        return resultado


class JustificativoRankingRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def obtener_por_id(self, justificativo_id: int) -> Optional[JustificativoRanking]:
        return self.db.get(JustificativoRanking, justificativo_id)

    def obtener_por_persona_y_periodo(
        self, persona_id: int, anio: int, mes: int
    ) -> Optional[JustificativoRanking]:
        return (
            self.db.query(JustificativoRanking)
            .filter(
                JustificativoRanking.persona_id == persona_id,
                JustificativoRanking.anio == anio,
                JustificativoRanking.mes == mes,
            )
            .first()
        )

    def listar_pendientes(self) -> list[JustificativoRanking]:
        from app.dominio.enums import EstadoJustificativoRanking
        return (
            self.db.query(JustificativoRanking)
            .filter(JustificativoRanking.estado == EstadoJustificativoRanking.PENDIENTE)
            .all()
        )

    def listar_por_persona(self, persona_id: int) -> list[JustificativoRanking]:
        """Historial completo (cualquier estado) de una persona, para que el
        propio alumno o su representante puedan ver también los rechazados
        con su motivo."""
        return (
            self.db.query(JustificativoRanking)
            .filter(JustificativoRanking.persona_id == persona_id)
            .all()
        )

    def crear(self, justificativo: JustificativoRanking) -> JustificativoRanking:
        self.db.add(justificativo)
        self.db.commit()
        self.db.refresh(justificativo)
        return justificativo

    def guardar_cambios(self, justificativo: JustificativoRanking) -> JustificativoRanking:
        self.db.commit()
        self.db.refresh(justificativo)
        return justificativo


class NotificacionRepositorio:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, notificacion: Notificacion) -> Notificacion:
        self.db.add(notificacion)
        self.db.commit()
        self.db.refresh(notificacion)
        return notificacion

    def listar_por_persona(self, persona_id: int) -> list[Notificacion]:
        return (
            self.db.query(Notificacion)
            .filter(Notificacion.persona_id == persona_id)
            .order_by(Notificacion.fecha_creacion.desc())
            .all()
        )

    def marcar_leida(self, notificacion: Notificacion) -> Notificacion:
        notificacion.leida = True
        self.db.commit()
        self.db.refresh(notificacion)
        return notificacion
