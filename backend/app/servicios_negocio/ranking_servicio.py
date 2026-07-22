"""
Servicio de negocio del módulo de Ranking (E03).

Decisiones de diseño registradas aquí porque son las que se acordaron
explícitamente con el equipo durante la integración (para que quien lea el
código no tenga que reconstruir el razonamiento desde cero):

1. Fórmula de puntos (RF004): puntos(p) = max(91 - p, 1).
   Es la única función lineal que conecta los tres anclajes del requisito
   (puesto 1 = 90, puesto 90+ = 1 fijo, descenso "proporcional" entre medio)
   sin inventar parámetros libres.

2. Cierre mensual MANUAL (no Celery Beat automático): lo dispara el
   Entrenador/Administrador con un endpoint explícito. Motivo: reproducible
   en demos/sustentación sin depender del calendario real, más fácil de
   testear, y no exige tener un worker de Celery Beat corriendo 24/7 en el
   VPS solo para esto.

3. "Nivel de Ranking" = grupo de entrenamiento (confirmado con el equipo):
   no existen como conceptos separados. NivelRanking es a la vez el
   agrupador de horarios de entrenamiento y el nivel competitivo.

4. Notificaciones in-app únicamente (no email/push).
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.dominio.modelos import (
    CierreMensualRanking, NivelRanking, Ranking, ResultadoRankingMensual, JustificativoRanking,
    Notificacion, Persona, Usuario, Rol, usuario_rol,
)
from app.dominio.enums import EstadoJustificativoRanking, TipoNotificacion, TipoRol
from app.dominio.excepciones import EntidadNoEncontrada, OperacionInvalida, PermisosInsuficientes, EntidadDuplicada
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.ranking_repositorio import (
    NivelRankingRepositorio, RankingRepositorio, ResultadoRankingMensualRepositorio,
    JustificativoRankingRepositorio, NotificacionRepositorio, CierreMensualRankingRepositorio,
)
from app.presentacion.schemas.ranking_schemas import (
    NivelRankingCreateDTO, AsignarNivelInicialDTO, ResultadoMensualRegistrarDTO,
    JustificativoCreateDTO, JustificativoEvaluarDTO, SeleccionOficialDTO,
    NivelRankingConOcupacionDTO, TablaRankingItemDTO, CierreMensualResponseDTO,
    SugerenciaMovimientoDTO, PerfilRankingAlumnoDTO,
    AsignacionRankingResponseDTO, ResultadoMensualRankingResponseDTO,
    CierreMensualRankingResponseDTO,
)

# --- Umbral de eliminación automática (E03-RF007) ---------------------------
MESES_CONSECUTIVOS_PARA_ELIMINAR = 2

# --- Cuántos candidatos de borde se sugieren por nivel al cerrar el mes -----
# Simplificación documentada: se sugiere solo el 1er lugar (candidato a
# ascenso) y el último lugar (candidato a descenso) de cada nivel. Si se
# necesita sugerir un rango más amplio, este es el único número a ajustar.
CANDIDATOS_DE_BORDE_POR_NIVEL = 1


def calcular_puntos_por_posicion(posicion: int) -> int:
    """E03-RF004. puntos(1)=90, puntos(89)=2, puntos(90+)=1."""
    if posicion < 1:
        raise OperacionInvalida("La posición debe ser un entero positivo")
    return max(91 - posicion, 1)


class NivelRankingServicio:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NivelRankingRepositorio(db)

    def crear_nivel(self, datos: NivelRankingCreateDTO) -> NivelRanking:
        if self.repo.obtener_por_numero(datos.numero_nivel):
            raise EntidadDuplicada(f"Ya existe un nivel de ranking número {datos.numero_nivel}")
        nivel = NivelRanking(numero_nivel=datos.numero_nivel, nombre=datos.nombre)
        return self.repo.crear(nivel)

    def obtener_nivel(self, nivel_id: int) -> NivelRanking:
        nivel = self.repo.obtener_por_id(nivel_id)
        if not nivel:
            raise EntidadNoEncontrada(f"Nivel de ranking con id {nivel_id} no encontrado")
        return nivel

    def listar_niveles_con_ocupacion(self) -> list[NivelRankingConOcupacionDTO]:
        niveles = self.repo.listar()
        resultado = []
        for nivel in niveles:
            actuales = self.repo.contar_personas_en_nivel(nivel.id)
            resultado.append(
                NivelRankingConOcupacionDTO(
                    id=nivel.id,
                    numero_nivel=nivel.numero_nivel,
                    nombre=nivel.nombre,
                    capacidad_minima=nivel.capacidad_minima,
                    capacidad_maxima=nivel.capacidad_maxima,
                    personas_actuales=actuales,
                    cupos_disponibles=max(nivel.capacidad_maxima - actuales, 0),
                    necesita_revision=actuales < nivel.capacidad_minima,
                )
            )
        return resultado

    def _validar_capacidad_disponible(self, nivel_id: int) -> None:
        """E03-RF001: máximo 10 por nivel, se bloquea de forma dura. El
        mínimo de 6 NO se bloquea aquí (ver docstring de NivelRanking en
        modelos.py) -- se informa vía listar_niveles_con_ocupacion."""
        nivel = self.obtener_nivel(nivel_id)
        actuales = self.repo.contar_personas_en_nivel(nivel_id)
        if actuales >= nivel.capacidad_maxima:
            raise OperacionInvalida(
                f"El nivel de ranking '{nivel.nombre or nivel.numero_nivel}' ya "
                f"alcanzó su capacidad máxima ({nivel.capacidad_maxima} deportistas)"
            )


class RankingServicio:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RankingRepositorio(db)
        self.repo_nivel = NivelRankingRepositorio(db)
        self.repo_resultado = ResultadoRankingMensualRepositorio(db)
        self.repo_justificativo = JustificativoRankingRepositorio(db)
        self.repo_notificacion = NotificacionRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)
        self.repo_cierre = CierreMensualRankingRepositorio(db)

    # --- Listados para frontend -----------------------------------------------
    def listar_asignaciones(self) -> list[AsignacionRankingResponseDTO]:
        rankings = self.repo.listar_todos(solo_activos=True)
        resultado = []
        for r in rankings:
            nivel = r.nivel_ranking
            resultado.append(
                AsignacionRankingResponseDTO(
                    persona_id=r.persona_id,
                    persona_nombre_completo=f"{r.persona.nombres} {r.persona.apellidos}",
                    nivel_ranking_id=r.nivel_ranking_id,
                    nivel_ranking_nombre=nivel.nombre if nivel else None,
                    nivel_ranking_numero=nivel.numero_nivel if nivel else 0,
                    posicion_actual=r.posicion_actual,
                    puntaje_acumulado=r.puntaje_acumulado,
                    esta_en_ranking=r.esta_en_ranking,
                )
            )
        return resultado

    def listar_resultados_mensuales(
        self, nivel_id: int | None = None, anio: int | None = None, mes: int | None = None
    ) -> list[ResultadoMensualRankingResponseDTO]:
        if nivel_id:
            resultados = self.repo_resultado.listar_por_nivel(nivel_id)
        else:
            resultados = self.repo_resultado.listar_todos()

        resultado = []
        for r in resultados:
            if anio and r.anio != anio:
                continue
            if mes and r.mes != mes:
                continue
            persona = r.persona
            nivel = r.nivel_ranking
            resultado.append(
                ResultadoMensualRankingResponseDTO(
                    id=r.id,
                    persona_id=r.persona_id,
                    persona_nombre_completo=f"{persona.nombres} {persona.apellidos}" if persona else "",
                    nivel_ranking_id=r.nivel_ranking_id,
                    nivel_ranking_nombre=nivel.nombre if nivel else None,
                    anio=r.anio,
                    mes=r.mes,
                    posicion=r.posicion,
                    puntos_obtenidos=r.puntos_obtenidos,
                    participo=r.participo,
                    ausencia_justificada=r.ausencia_justificada,
                )
            )
        return resultado

    def listar_cierres_mensuales(
        self, nivel_id: int | None = None
    ) -> list[CierreMensualRankingResponseDTO]:
        if nivel_id:
            cierres = self.repo_cierre.listar_por_nivel(nivel_id)
        else:
            cierres = self.repo_cierre.listar_todos()

        resultado = []
        for c in cierres:
            nivel = c.nivel_ranking
            cerrado_por = c.cerrado_por
            resultado.append(
                CierreMensualRankingResponseDTO(
                    id=c.id,
                    nivel_ranking_id=c.nivel_ranking_id,
                    nivel_ranking_nombre=nivel.nombre if nivel else None,
                    nivel_ranking_numero=nivel.numero_nivel if nivel else 0,
                    anio=c.anio,
                    mes=c.mes,
                    personas_procesadas=c.personas_procesadas,
                    cerrado_por_id=c.cerrado_por_id,
                    cerrado_por_nombre=f"{cerrado_por.nombres} {cerrado_por.apellidos}" if cerrado_por else "",
                    cerrado_en=c.cerrado_en,
                )
            )
        return resultado

    # --- E03-RF002: asignación de nivel inicial -----------------------------
    def asignar_nivel_inicial(self, datos: AsignarNivelInicialDTO) -> Ranking:
        persona = self.repo_persona.obtener_por_id(datos.persona_id)
        if not persona:
            raise EntidadNoEncontrada(f"Persona con id {datos.persona_id} no encontrada")

        nivel_servicio = NivelRankingServicio(self.db)
        nivel_servicio.obtener_nivel(datos.nivel_ranking_id)  # 404 si no existe
        nivel_servicio._validar_capacidad_disponible(datos.nivel_ranking_id)

        ranking = self.repo.obtener_por_persona(datos.persona_id)
        if ranking is None:
            ranking = Ranking(persona_id=datos.persona_id, nivel_ranking_id=datos.nivel_ranking_id)
            return self.repo.crear(ranking)

        if ranking.esta_en_ranking and ranking.nivel_ranking_id is not None:
            raise OperacionInvalida(
                "Esta persona ya tiene un nivel de ranking asignado; use el "
                "endpoint de movimiento para reasignarla"
            )
        ranking.nivel_ranking_id = datos.nivel_ranking_id
        ranking.esta_en_ranking = True
        return self.repo.guardar_cambios(ranking)

    def mover_de_nivel(self, persona_id: int, nuevo_nivel_id: int) -> Ranking:
        """Aplica manualmente un ascenso/descenso (sugerido por el cierre
        mensual o decidido directamente por el Entrenador/Administrador)."""
        ranking = self.repo.obtener_por_persona(persona_id)
        if not ranking:
            raise EntidadNoEncontrada(f"No existe ranking para la persona {persona_id}")

        nivel_servicio = NivelRankingServicio(self.db)
        nivel_servicio.obtener_nivel(nuevo_nivel_id)
        nivel_servicio._validar_capacidad_disponible(nuevo_nivel_id)

        ranking.nivel_ranking_id = nuevo_nivel_id
        return self.repo.guardar_cambios(ranking)

    def obtener_tabla_de_nivel(self, nivel_id: int) -> list[TablaRankingItemDTO]:
        """E03-RF010."""
        NivelRankingServicio(self.db).obtener_nivel(nivel_id)  # 404 si no existe
        rankings = self.repo.listar_por_nivel(nivel_id, solo_activos=True)
        return [
            TablaRankingItemDTO(
                persona_id=r.persona_id,
                persona_nombre_completo=f"{r.persona.nombres} {r.persona.apellidos}",
                posicion_actual=r.posicion_actual,
                puntaje_acumulado=r.puntaje_acumulado,
                esta_en_ranking=r.esta_en_ranking,
            )
            for r in rankings
        ]

    # --- E03-RF003: registrar resultado mensual de una persona -------------
    def registrar_resultado_mensual(self, datos: ResultadoMensualRegistrarDTO) -> ResultadoRankingMensual:
        ranking = self.repo.obtener_por_persona(datos.persona_id)
        if not ranking or ranking.nivel_ranking_id is None:
            raise OperacionInvalida(
                "La persona no tiene un nivel de ranking asignado; "
                "asígnele uno primero (RF002)"
            )
        if datos.participo and datos.posicion is None:
            raise OperacionInvalida("Si participó, debe indicarse la posición obtenida")

        existente = self.repo_resultado.obtener(datos.persona_id, datos.anio, datos.mes)
        if existente:
            raise EntidadDuplicada(
                f"Ya existe un resultado registrado para esta persona en {datos.mes}/{datos.anio}"
            )

        justificativo = self.repo_justificativo.obtener_por_persona_y_periodo(
            datos.persona_id, datos.anio, datos.mes
        )
        ausencia_justificada = bool(
            justificativo and justificativo.estado == EstadoJustificativoRanking.APROBADO
        )

        puntos = calcular_puntos_por_posicion(datos.posicion) if datos.participo else 0

        resultado = ResultadoRankingMensual(
            persona_id=datos.persona_id,
            nivel_ranking_id=ranking.nivel_ranking_id,
            anio=datos.anio,
            mes=datos.mes,
            posicion=datos.posicion,
            puntos_obtenidos=puntos,
            participo=datos.participo,
            ausencia_justificada=ausencia_justificada,
        )
        return self.repo_resultado.crear(resultado)

    # --- E03-RF004/RF005/RF007/RF009: cierre mensual de un nivel -----------
    def cerrar_mes(self, nivel_id: int, anio: int, mes: int, cerrado_por_id: int) -> CierreMensualResponseDTO:
        """Dispara manualmente (botón "Cerrar ranking del mes") por
        Entrenador/Administrador. Ver docstring del módulo, punto 2."""
        nivel_servicio = NivelRankingServicio(self.db)
        nivel = nivel_servicio.obtener_nivel(nivel_id)

        rankings_activos = self.repo.listar_por_nivel(nivel_id, solo_activos=True)
        resultados = {
            r.persona_id: r
            for r in self.repo_resultado.listar_por_nivel_y_periodo(nivel_id, anio, mes)
        }

        eliminadas: list[int] = []
        procesadas = 0

        for ranking in rankings_activos:
            resultado = resultados.get(ranking.persona_id)
            if resultado is None:
                # Nadie registró su resultado para este alumno este mes:
                # se trata como "no participó" (RF005), revisando si tiene
                # justificativo aprobado para el período.
                justificativo = self.repo_justificativo.obtener_por_persona_y_periodo(
                    ranking.persona_id, anio, mes
                )
                ausencia_justificada = bool(
                    justificativo and justificativo.estado == EstadoJustificativoRanking.APROBADO
                )
                resultado = self.repo_resultado.crear(
                    ResultadoRankingMensual(
                        persona_id=ranking.persona_id,
                        nivel_ranking_id=nivel_id,
                        anio=anio,
                        mes=mes,
                        posicion=None,
                        puntos_obtenidos=0,
                        participo=False,
                        ausencia_justificada=ausencia_justificada,
                    )
                )

            procesadas += 1
            ranking.puntaje_acumulado += resultado.puntos_obtenidos

            if resultado.participo or resultado.ausencia_justificada:
                ranking.meses_consecutivos_ausente = 0
                if resultado.participo:
                    ranking.ultimo_combate_o_asistencia = datetime.now(timezone.utc)
            else:
                ranking.meses_consecutivos_ausente += 1

            # --- E03-RF007: notificar y luego eliminar -----------------
            if ranking.meses_consecutivos_ausente >= MESES_CONSECUTIVOS_PARA_ELIMINAR:
                self._notificar_entrenadores_y_admins(
                    nivel_id,
                    TipoNotificacion.RANKING_ELIMINACION_PROXIMA,
                    f"{ranking.persona.nombres} {ranking.persona.apellidos} será "
                    f"eliminado del ranking por {ranking.meses_consecutivos_ausente} "
                    f"meses consecutivos sin participar sin justificativo aprobado.",
                    ranking.id,
                )
                ranking.esta_en_ranking = False
                ranking.meses_consecutivos_ausente = 0
                eliminadas.append(ranking.persona_id)

            self.repo.guardar_cambios(ranking)

        # --- E03-RF009: recalcular posiciones y sugerir ascensos/descensos --
        activos_restantes = [r for r in rankings_activos if r.esta_en_ranking]
        activos_restantes.sort(key=lambda r: (-r.puntaje_acumulado, r.persona_id))
        for indice, ranking in enumerate(activos_restantes, start=1):
            ranking.posicion_actual = indice
            self.repo.guardar_cambios(ranking)

        sugerencias = self._sugerir_movimientos(nivel, activos_restantes)

        cierre_record = CierreMensualRanking(
            nivel_ranking_id=nivel_id,
            anio=anio,
            mes=mes,
            personas_procesadas=procesadas,
            cerrado_por_id=cerrado_por_id,
        )
        self.repo_cierre.crear(cierre_record)

        return CierreMensualResponseDTO(
            nivel_ranking_id=nivel_id,
            anio=anio,
            mes=mes,
            personas_procesadas=procesadas,
            personas_eliminadas=eliminadas,
            sugerencias=sugerencias,
        )

    def _sugerir_movimientos(
        self, nivel: NivelRanking, activos_ordenados: list[Ranking]
    ) -> list[SugerenciaMovimientoDTO]:
        sugerencias: list[SugerenciaMovimientoDTO] = []
        if not activos_ordenados:
            return sugerencias

        nivel_superior = self.repo_nivel.obtener_por_numero(nivel.numero_nivel - 1)
        nivel_inferior = self.repo_nivel.obtener_por_numero(nivel.numero_nivel + 1)

        if nivel_superior:
            for r in activos_ordenados[:CANDIDATOS_DE_BORDE_POR_NIVEL]:
                sugerencias.append(
                    SugerenciaMovimientoDTO(
                        persona_id=r.persona_id,
                        persona_nombre_completo=f"{r.persona.nombres} {r.persona.apellidos}",
                        tipo="ASCENSO",
                        nivel_actual_id=nivel.id,
                        nivel_sugerido_id=nivel_superior.id,
                    )
                )
                self._notificar_persona(
                    r.persona_id, TipoNotificacion.RANKING_ASCENSO_SUGERIDO,
                    f"Tu entrenador sugirió tu ascenso al nivel {nivel_superior.numero_nivel}.",
                    r.id,
                )

        if nivel_inferior:
            for r in activos_ordenados[-CANDIDATOS_DE_BORDE_POR_NIVEL:]:
                sugerencias.append(
                    SugerenciaMovimientoDTO(
                        persona_id=r.persona_id,
                        persona_nombre_completo=f"{r.persona.nombres} {r.persona.apellidos}",
                        tipo="DESCENSO",
                        nivel_actual_id=nivel.id,
                        nivel_sugerido_id=nivel_inferior.id,
                    )
                )
                self._notificar_persona(
                    r.persona_id, TipoNotificacion.RANKING_DESCENSO_SUGERIDO,
                    f"Tu entrenador sugirió tu descenso al nivel {nivel_inferior.numero_nivel}.",
                    r.id,
                )
        return sugerencias

    # --- E03-RF006a: alumno/representante registra justificativo -----------
    def crear_justificativo(
        self, persona_id_solicitante: int, datos: JustificativoCreateDTO, persona_objetivo_id: int
    ) -> JustificativoRanking:
        persona_objetivo = self._obtener_persona_verificando_dueno_o_representante(
            persona_id_solicitante, persona_objetivo_id,
            mensaje_error="Solo el propio alumno o su representante pueden registrar este justificativo",
        )

        if self.repo_justificativo.obtener_por_persona_y_periodo(
            persona_objetivo_id, datos.anio, datos.mes
        ):
            raise EntidadDuplicada("Ya existe un justificativo para esta persona en ese período")

        justificativo = JustificativoRanking(
            persona_id=persona_objetivo_id,
            anio=datos.anio,
            mes=datos.mes,
            motivo=datos.motivo,
            archivo_url=datos.archivo_url,
            observaciones=datos.observaciones,
        )
        return self.repo_justificativo.crear(justificativo)

    # --- E03-RF006b: administrador lista pendientes de evaluación ----------
    def listar_justificativos_pendientes(self) -> list[JustificativoRanking]:
        """Listado de justificativos con estado PENDIENTE, para revisión del
        administrador (E03-RF006b)."""
        return self.repo_justificativo.listar_pendientes()

    # --- E04-RF012 ampliado: alumno/representante ve su propio historial ---
    def listar_justificativos_de_persona(
        self, persona_id_solicitante: int, persona_id_objetivo: int
    ) -> list[JustificativoRanking]:
        """Historial completo (cualquier estado, incluyendo RECHAZADO con su
        motivo) de los justificativos de una persona. Mismo criterio de
        autorización que `crear_justificativo`: el propio alumno o su
        representante."""
        self._obtener_persona_verificando_dueno_o_representante(
            persona_id_solicitante, persona_id_objetivo,
            mensaje_error="Solo el propio alumno o su representante pueden ver este historial",
        )
        return self.repo_justificativo.listar_por_persona(persona_id_objetivo)

    def _obtener_persona_verificando_dueno_o_representante(
        self, persona_id_solicitante: int, persona_objetivo_id: int, mensaje_error: str
    ):
        """Helper compartido: 404 si la persona objetivo no existe, 403 si
        quien solicita no es ni la propia persona ni su representante."""
        persona_objetivo = self.repo_persona.obtener_por_id(persona_objetivo_id)
        if not persona_objetivo:
            raise EntidadNoEncontrada(f"Persona con id {persona_objetivo_id} no encontrada")

        es_el_propio = persona_id_solicitante == persona_objetivo_id
        es_su_representante = persona_objetivo.representante_id == persona_id_solicitante
        if not (es_el_propio or es_su_representante):
            raise PermisosInsuficientes(mensaje_error)
        return persona_objetivo

    # --- E03-RF006b: administrador evalúa ------------------------------------
    def evaluar_justificativo(
        self, justificativo_id: int, datos: JustificativoEvaluarDTO
    ) -> JustificativoRanking:
        justificativo = self.repo_justificativo.obtener_por_id(justificativo_id)
        if not justificativo:
            raise EntidadNoEncontrada(f"Justificativo con id {justificativo_id} no encontrado")
        if justificativo.estado != EstadoJustificativoRanking.PENDIENTE:
            raise OperacionInvalida("Este justificativo ya fue evaluado")

        justificativo.estado = datos.estado
        justificativo.motivo_rechazo = datos.motivo_rechazo
        justificativo.fecha_evaluacion = datetime.now(timezone.utc)

        if datos.estado == EstadoJustificativoRanking.APROBADO:
            # Si el resultado del mes ya se había registrado como "no
            # participó" ANTES de aprobarse el justificativo, se corrige
            # retroactivamente para que la excepción de RF005 realmente
            # cuente y no penalice al alumno.
            resultado = self.repo_resultado.obtener(
                justificativo.persona_id, justificativo.anio, justificativo.mes
            )
            if resultado and not resultado.participo:
                resultado.ausencia_justificada = True
                self.repo_resultado.guardar_cambios(resultado)
            ranking = self.repo.obtener_por_persona(justificativo.persona_id)
            if ranking:
                ranking.meses_consecutivos_ausente = 0
                self.repo.guardar_cambios(ranking)
            self._notificar_persona(
                justificativo.persona_id, TipoNotificacion.JUSTIFICATIVO_APROBADO,
                f"Tu justificativo de {justificativo.mes}/{justificativo.anio} fue aprobado.",
                justificativo.id,
            )
        else:
            self._notificar_persona(
                justificativo.persona_id, TipoNotificacion.JUSTIFICATIVO_RECHAZADO,
                f"Tu justificativo de {justificativo.mes}/{justificativo.anio} fue rechazado.",
                justificativo.id,
            )

        return self.repo_justificativo.guardar_cambios(justificativo)

    # --- E03-RF008: reingreso -------------------------------------------------
    def reingresar(self, persona_id: int) -> Ranking:
        ranking = self.repo.obtener_por_persona(persona_id)
        if not ranking:
            raise EntidadNoEncontrada(f"No existe ranking para la persona {persona_id}")
        if ranking.esta_en_ranking:
            raise OperacionInvalida("Esta persona ya está activa en el ranking")

        tiene_justificativo_aprobado = any(
            j.estado == EstadoJustificativoRanking.APROBADO
            for j in self.db.query(JustificativoRanking)
            .filter(JustificativoRanking.persona_id == persona_id)
            .all()
        )
        if not tiene_justificativo_aprobado:
            raise OperacionInvalida(
                "El reingreso solo procede si la falta que causó la eliminación "
                "tiene un justificativo aprobado"
            )

        # "Último nivel registrado" = el nivel más bajo (numero_nivel más alto).
        niveles = self.repo_nivel.listar()
        if not niveles:
            raise OperacionInvalida("No hay niveles de ranking configurados todavía")
        nivel_mas_bajo = max(niveles, key=lambda n: n.numero_nivel)

        ranking.esta_en_ranking = True
        ranking.nivel_ranking_id = nivel_mas_bajo.id
        ranking.meses_consecutivos_ausente = 0
        self._notificar_persona(
            persona_id, TipoNotificacion.RANKING_REINGRESO_APROBADO,
            f"Reingresaste al ranking en el nivel {nivel_mas_bajo.numero_nivel}.",
            ranking.id,
        )
        return self.repo.guardar_cambios(ranking)

    # --- E03-RF011: selección oficial ------------------------------------------
    def marcar_seleccion_oficial(self, datos: SeleccionOficialDTO) -> list[Ranking]:
        actualizados = []
        for persona_id in datos.persona_ids:
            ranking = self.repo.obtener_por_persona(persona_id)
            if not ranking:
                raise EntidadNoEncontrada(f"No existe ranking para la persona {persona_id}")
            ranking.seleccion_oficial = True
            ranking.anio_seleccion = datos.anio
            actualizados.append(self.repo.guardar_cambios(ranking))
        return actualizados

    def listar_seleccion_oficial(self, anio: int | None = None) -> list["SeleccionOficialItemDTO"]:
        from app.presentacion.schemas.ranking_schemas import SeleccionOficialItemDTO
        rankings = self.repo.listar_seleccion_oficial(anio)
        resultado = []
        for r in rankings:
            resultado.append(
                SeleccionOficialItemDTO(
                    persona_id=r.persona_id,
                    persona_nombre_completo=f"{r.persona.nombres} {r.persona.apellidos}",
                    anio_seleccion=r.anio_seleccion,
                )
            )
        return resultado

    def quitar_seleccion_oficial(self, persona_id: int) -> None:
        ranking = self.repo.obtener_por_persona(persona_id)
        if not ranking:
            raise EntidadNoEncontrada(f"No existe ranking para la persona {persona_id}")
        if not ranking.seleccion_oficial:
            raise OperacionInvalida(f"La persona {persona_id} no está en la selección oficial")
        ranking.seleccion_oficial = False
        ranking.anio_seleccion = None
        self.repo.guardar_cambios(ranking)

    # --- E04-RF012: perfil privado del alumno -----------------------------
    def obtener_perfil_alumno(self, persona_id: int) -> PerfilRankingAlumnoDTO:
        ranking = self.repo.obtener_por_persona(persona_id)
        if not ranking:
            raise EntidadNoEncontrada("Esta persona no tiene ranking registrado todavía")
        nivel = ranking.nivel_ranking
        return PerfilRankingAlumnoDTO(
            persona_id=persona_id,
            posicion_actual=ranking.posicion_actual,
            puntaje_acumulado=ranking.puntaje_acumulado,
            nivel_ranking_id=ranking.nivel_ranking_id,
            nivel_ranking_nombre=(nivel.nombre if nivel else None),
            esta_en_ranking=ranking.esta_en_ranking,
        )

    # --- Notificaciones internas --------------------------------------------
    def _notificar_persona(
        self, persona_id: int, tipo: TipoNotificacion, mensaje: str, entidad_relacionada_id: int | None
    ) -> None:
        self.repo_notificacion.crear(
            Notificacion(
                persona_id=persona_id, tipo=tipo, mensaje=mensaje,
                entidad_relacionada_id=entidad_relacionada_id,
            )
        )

    def _notificar_entrenadores_y_admins(
        self, nivel_id: int, tipo: TipoNotificacion, mensaje: str, entidad_relacionada_id: int | None
    ) -> None:
        """RF007 exige notificar a Entrenador y Administrador antes de
        ejecutar la eliminación. Entrenadores: los de los horarios de este
        nivel. Administradores: todos los que tengan el rol ADMINISTRADOR."""
        nivel = self.repo_nivel.obtener_por_id(nivel_id)
        destinatarios_ids: set[int] = set()
        if nivel:
            destinatarios_ids.update(h.entrenador_id for h in nivel.horarios)

        admins = (
            self.db.query(Persona.id)
            .join(Usuario, Usuario.persona_id == Persona.id)
            .join(usuario_rol, usuario_rol.c.usuario_id == Usuario.id)
            .join(Rol, Rol.id == usuario_rol.c.rol_id)
            .filter(Rol.tipo_rol == TipoRol.ADMINISTRADOR)
            .all()
        )
        destinatarios_ids.update(a[0] for a in admins)

        for persona_id in destinatarios_ids:
            self._notificar_persona(persona_id, tipo, mensaje, entidad_relacionada_id)


class NotificacionServicio:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificacionRepositorio(db)

    def listar_propias(self, persona_id: int) -> list[Notificacion]:
        return self.repo.listar_por_persona(persona_id)

    def marcar_leida(self, notificacion_id: int, persona_id: int) -> Notificacion:
        notificacion = self.db.get(Notificacion, notificacion_id)
        if notificacion is None:
            raise EntidadNoEncontrada(f"Notificación con id {notificacion_id} no encontrada")
        if notificacion.persona_id != persona_id:
            raise PermisosInsuficientes("No puede marcar como leída una notificación ajena")
        return self.repo.marcar_leida(notificacion)
