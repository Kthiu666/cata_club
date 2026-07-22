"""
Tests del módulo de Ranking (E03). Usa las mismas fixtures `client` /
`client_sin_permisos` de conftest.py (persona_id=1 con roles
ADMINISTRADOR+ENTRENADOR combinados para `client`).
"""
import pytest

from app.servicios_negocio.ranking_servicio import calcular_puntos_por_posicion


def _crear_persona(client, cedula):
    return client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Deportista", "apellidos": cedula, "cedula": cedula,
            "fecha_nacimiento": "2010-05-14", "telefono": "0991234567",
        },
    ).json()


def _crear_nivel(client, numero_nivel, nombre="Nivel"):
    return client.post(
        "/api/v1/ranking/niveles", json={"numero_nivel": numero_nivel, "nombre": nombre}
    ).json()


def _asignar_nivel(client, persona_id, nivel_id):
    return client.post(
        "/api/v1/ranking/asignar-nivel-inicial",
        json={"persona_id": persona_id, "nivel_ranking_id": nivel_id},
    )


def _registrar_resultado(client, persona_id, anio, mes, posicion, participo):
    return client.post(
        "/api/v1/ranking/resultados-mensuales",
        json={
            "persona_id": persona_id, "anio": anio, "mes": mes,
            "posicion": posicion, "participo": participo,
        },
    )


# --- Fórmula de puntos (RF004) -----------------------------------------------
@pytest.mark.parametrize(
    "posicion,puntos_esperados",
    [(1, 90), (2, 89), (45, 46), (89, 2), (90, 1), (150, 1)],
)
def test_formula_de_puntos(posicion, puntos_esperados):
    assert calcular_puntos_por_posicion(posicion) == puntos_esperados


def test_formula_de_puntos_rechaza_posicion_invalida():
    from app.dominio.excepciones import OperacionInvalida
    with pytest.raises(OperacionInvalida):
        calcular_puntos_por_posicion(0)


# --- Niveles de ranking (RF001) ----------------------------------------------
def test_crear_nivel_requiere_admin(client_sin_permisos):
    resp = client_sin_permisos.post(
        "/api/v1/ranking/niveles", json={"numero_nivel": 1, "nombre": "Elite"}
    )
    assert resp.status_code == 403


def test_crear_nivel_duplicado_falla(client):
    _crear_nivel(client, 1, "Elite")
    resp = client.post("/api/v1/ranking/niveles", json={"numero_nivel": 1, "nombre": "Otro"})
    assert resp.status_code == 400


def test_listar_niveles_marca_necesita_revision_bajo_minimo(client):
    _crear_nivel(client, 1, "Elite")
    resp = client.get("/api/v1/ranking/niveles")
    assert resp.status_code == 200
    assert resp.json()[0]["necesitaRevision"] is True  # 0 personas < mínimo 6


def test_asignar_nivel_bloquea_al_llegar_a_capacidad_maxima(client):
    nivel = _crear_nivel(client, 1, "Elite")
    for i in range(10):
        persona = _crear_persona(client, cedula=f"170000000{i}")
        resp = _asignar_nivel(client, persona["id"], nivel["id"])
        assert resp.status_code == 201

    persona_11 = _crear_persona(client, cedula="1799999999")
    resp = _asignar_nivel(client, persona_11["id"], nivel["id"])
    assert resp.status_code == 400
    assert "capacidad máxima" in resp.json()["detail"]


def test_asignar_nivel_inicial_requiere_entrenador(client_sin_permisos):
    resp = _asignar_nivel(client_sin_permisos, 999, 1)
    assert resp.status_code == 403


def test_no_se_puede_reasignar_nivel_ya_asignado_con_endpoint_de_asignacion(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, cedula="1711111111")
    _asignar_nivel(client, persona["id"], nivel["id"])
    resp = _asignar_nivel(client, persona["id"], nivel["id"])
    assert resp.status_code == 400


# --- Resultados mensuales (RF003) --------------------------------------------
def test_diferencia_no_participo_de_ultimo_lugar(client):
    """RF003: registrar un resultado con participo=False no otorga puntos,
    a diferencia de alguien que participó y quedó último con puntaje bajo.
    (Nota: la comparación contra un cierre mensual real fue removida junto
    con RF004/RF005/RF007/RF009 -- ver módulo docstring de
    `ranking_servicio.py` -- este test solo cubre el registro individual,
    que sigue existiendo.)"""
    nivel = _crear_nivel(client, 1, "Elite")
    ausente = _crear_persona(client, "1733333333")
    _asignar_nivel(client, ausente["id"], nivel["id"])

    resp = _registrar_resultado(client, ausente["id"], 2026, 7, posicion=None, participo=False)
    assert resp.status_code == 201
    body = resp.json()
    assert body["participo"] is False
    assert body["puntosObtenidos"] == 0


def test_registrar_resultado_participo_sin_posicion_falla(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1744444444")
    _asignar_nivel(client, persona["id"], nivel["id"])
    resp = _registrar_resultado(client, persona["id"], 2026, 7, posicion=None, participo=True)
    assert resp.status_code == 400


# --- Cierre mensual: superficie removida (spec "Removed endpoints return 404") ---
def test_cerrar_mes_removido_devuelve_404(client):
    nivel = _crear_nivel(client, 1, "Elite")
    resp = client.post(
        f"/api/v1/ranking/niveles/{nivel['id']}/cerrar-mes", params={"anio": 2026, "mes": 7}
    )
    assert resp.status_code == 404


def test_listar_cierres_mensuales_removido_devuelve_404(client):
    resp = client.get("/api/v1/ranking/cierres-mensuales")
    assert resp.status_code == 404


# --- Justificativos (RF006a/RF006b) -----------------------------------------
def test_representante_puede_crear_justificativo_para_su_representado(client):
    nivel = _crear_nivel(client, 1, "Elite")
    representante = _crear_persona(client, "1777777777")
    alumno = client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Hijo", "apellidos": "Representado", "cedula": "1788888888",
            "fecha_nacimiento": "2015-05-14", "telefono": "0991234567",
            "representante_id": representante["id"],
        },
    ).json()
    _asignar_nivel(client, alumno["id"], nivel["id"])

    resp = client.post(
        f"/api/v1/ranking/{alumno['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Viaje familiar"},
    )
    # El fixture `client` está autenticado como persona_id=1 == representante.id
    assert resp.status_code == 201
    assert resp.json()["estado"] == "PENDIENTE"


def test_persona_ajena_no_puede_crear_justificativo(client):
    nivel = _crear_nivel(client, 1, "Elite")
    # Se crea primero un "relleno" para que `otra_persona` NO quede con id=1
    # (el fixture `client` autentica como persona_id=1; si otra_persona
    # también fuera id=1 el test daría falso positivo por ser "el propio").
    _crear_persona(client, "1700000001")
    otra_persona = _crear_persona(client, "1799999998")
    _asignar_nivel(client, otra_persona["id"], nivel["id"])

    resp = client.post(
        f"/api/v1/ranking/{otra_persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Excusa"},
    )
    assert resp.status_code == 403


def test_aprobar_justificativo_corrige_retroactivamente_la_ausencia(client, db_session):
    """Si el resultado del mes ya se había registrado como no-participó
    ANTES de aprobarse el justificativo, la aprobación debe marcar
    ausencia_justificada=True. (Nota: el cierre mensual que originalmente
    disparaba esta verificación fue removido -- RF004/RF005/RF007/RF009
    derogadas -- pero la corrección retroactiva en sí vive en
    `evaluar_justificativo`, que sigue existiendo; por eso el test se
    ajustó para verificar directamente el resultado persistido en vez de
    eliminarse.)"""
    from app.dominio.modelos import ResultadoRankingMensual

    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1711122233")
    _asignar_nivel(client, persona["id"], nivel["id"])
    _registrar_resultado(client, persona["id"], 2026, 7, posicion=None, participo=False)

    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Certificado médico"},
    ).json()

    resp = client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar",
        json={"estado": "APROBADO"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "APROBADO"

    resultado = (
        db_session.query(ResultadoRankingMensual)
        .filter_by(persona_id=persona["id"], anio=2026, mes=7)
        .one()
    )
    assert resultado.ausencia_justificada is True


def test_evaluar_justificativo_requiere_admin(client_sin_permisos):
    resp = client_sin_permisos.patch(
        "/api/v1/ranking/justificativos/1/evaluar", json={"estado": "APROBADO"}
    )
    assert resp.status_code == 403


def test_rechazar_justificativo_sin_motivo_falla(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1711122234")
    _asignar_nivel(client, persona["id"], nivel["id"])
    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Certificado médico"},
    ).json()

    resp = client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar",
        json={"estado": "RECHAZADO"},
    )
    assert resp.status_code == 422


def test_rechazar_justificativo_con_motivo_solo_espacios_falla(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1711122235")
    _asignar_nivel(client, persona["id"], nivel["id"])
    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Certificado médico"},
    ).json()

    resp = client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar",
        json={"estado": "RECHAZADO", "motivo_rechazo": "   "},
    )
    assert resp.status_code == 422


def test_rechazar_justificativo_con_motivo_valido_persiste(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1711122236")
    _asignar_nivel(client, persona["id"], nivel["id"])
    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Certificado médico"},
    ).json()

    resp = client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar",
        json={"estado": "RECHAZADO", "motivo_rechazo": "No corresponde al mes declarado"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["estado"] == "RECHAZADO"
    assert body["motivoRechazo"] == "No corresponde al mes declarado"


def test_aprobar_justificativo_sin_motivo_rechazo_funciona(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1711122237")
    _asignar_nivel(client, persona["id"], nivel["id"])
    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Certificado médico"},
    ).json()

    resp = client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar",
        json={"estado": "APROBADO"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "APROBADO"


def test_listar_justificativos_pendientes_vacio_cuando_no_hay(client):
    resp = client.get("/api/v1/ranking/justificativos/pendientes")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_justificativos_pendientes_retorna_los_creados(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1799990001")
    _asignar_nivel(client, persona["id"], nivel["id"])

    creado = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Viaje familiar"},
    ).json()

    resp = client.get("/api/v1/ranking/justificativos/pendientes")
    assert resp.status_code == 200
    ids = [j["id"] for j in resp.json()]
    assert creado["id"] in ids


def test_listar_justificativos_pendientes_excluye_evaluados(client):
    """Ambos justificativos se registran vía representante (persona_id=1,
    igual al token de `client`) porque `crear_justificativo` solo permite al
    propio alumno o a su representante -- y solo la primera persona creada en
    una BD en memoria vacía obtiene id=1 (ver `_crear_persona`)."""
    nivel = _crear_nivel(client, 1, "Elite")
    representante = _crear_persona(client, "1799990002")

    def _crear_alumno_representado(cedula):
        return client.post(
            "/api/v1/personas/",
            json={
                "nombres": "Hijo", "apellidos": "Representado", "cedula": cedula,
                "fecha_nacimiento": "2015-05-14", "telefono": "0991234567",
                "representante_id": representante["id"],
            },
        ).json()

    pendiente = _crear_alumno_representado("1799990003")
    evaluado = _crear_alumno_representado("1799990004")
    _asignar_nivel(client, pendiente["id"], nivel["id"])
    _asignar_nivel(client, evaluado["id"], nivel["id"])

    justificativo_pendiente = client.post(
        f"/api/v1/ranking/{pendiente['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Viaje familiar"},
    ).json()
    justificativo_evaluado = client.post(
        f"/api/v1/ranking/{evaluado['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Certificado médico"},
    ).json()
    client.patch(
        f"/api/v1/ranking/justificativos/{justificativo_evaluado['id']}/evaluar",
        json={"estado": "APROBADO"},
    )

    resp = client.get("/api/v1/ranking/justificativos/pendientes")
    assert resp.status_code == 200
    ids = [j["id"] for j in resp.json()]
    assert justificativo_pendiente["id"] in ids
    assert justificativo_evaluado["id"] not in ids


def test_listar_justificativos_pendientes_requiere_admin(client_sin_permisos):
    resp = client_sin_permisos.get("/api/v1/ranking/justificativos/pendientes")
    assert resp.status_code == 403


# --- Historial de justificativos de una persona (E04-RF012 ampliado) --------
def test_alumno_ve_su_propio_historial_incluyendo_rechazados_con_motivo(client):
    """El fixture `client` autentica como persona_id=1; al crear la primera
    persona en un test con base de datos limpia, ésta recibe id=1, con lo que
    queda siendo "el propio" desde la perspectiva del token."""
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1722233344")
    assert persona["id"] == 1
    _asignar_nivel(client, persona["id"], nivel["id"])

    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Excusa"},
    ).json()
    client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar",
        json={"estado": "RECHAZADO", "motivo_rechazo": "Comprobante ilegible"},
    )

    resp = client.get(f"/api/v1/ranking/{persona['id']}/justificativos")
    assert resp.status_code == 200
    historial = resp.json()
    assert len(historial) == 1
    assert historial[0]["estado"] == "RECHAZADO"
    assert historial[0]["motivoRechazo"] == "Comprobante ilegible"


def test_representante_ve_el_historial_de_su_representado(client):
    nivel = _crear_nivel(client, 1, "Elite")
    representante = _crear_persona(client, "1733344455")
    assert representante["id"] == 1
    alumno = client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Hijo", "apellidos": "Representado", "cedula": "1744455566",
            "fecha_nacimiento": "2015-05-14", "telefono": "0991234567",
            "representante_id": representante["id"],
        },
    ).json()
    _asignar_nivel(client, alumno["id"], nivel["id"])
    client.post(
        f"/api/v1/ranking/{alumno['id']}/justificativos",
        json={"anio": 2026, "mes": 7, "motivo": "Viaje familiar"},
    )

    resp = client.get(f"/api/v1/ranking/{alumno['id']}/justificativos")
    assert resp.status_code == 200
    historial = resp.json()
    assert len(historial) == 1
    assert historial[0]["personaId"] == alumno["id"]


def test_persona_sin_relacion_no_puede_ver_historial_ajeno(client):
    # Relleno para que `otra_persona` no quede con id=1 (el token de
    # `client` autentica como persona_id=1).
    _crear_persona(client, "1700000002")
    otra_persona = _crear_persona(client, "1799999997")

    resp = client.get(f"/api/v1/ranking/{otra_persona['id']}/justificativos")
    assert resp.status_code == 403


def test_historial_de_justificativos_vacio_cuando_no_hay(client):
    persona = _crear_persona(client, "1755566677")
    assert persona["id"] == 1

    resp = client.get(f"/api/v1/ranking/{persona['id']}/justificativos")
    assert resp.status_code == 200
    assert resp.json() == []


# --- Reingreso (RF008) -------------------------------------------------------
def test_reingreso_requiere_justificativo_aprobado(client, db_session):
    """RF008: el reingreso requiere que la baja tenga un justificativo
    aprobado. La baja de `esta_en_ranking` ya no ocurre vía ningún mecanismo
    automático (cierre mensual y limpieza por inactividad fueron removidos
    -- RF004/RF005/RF007/RF009 derogadas, ver apply-progress de
    `limpieza-asistencia-y-nivel-entrenador` slices B2/E); se simula aquí
    desactivando directamente vía DB, como haría una baja administrativa."""
    from app.dominio.modelos import Ranking

    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1712223344")
    _asignar_nivel(client, persona["id"], nivel["id"])

    ranking = db_session.query(Ranking).filter_by(persona_id=persona["id"]).one()
    ranking.esta_en_ranking = False
    db_session.commit()

    resp = client.post(f"/api/v1/ranking/{persona['id']}/reingresar")
    assert resp.status_code == 400


def test_reingreso_ubica_en_el_nivel_mas_bajo(client, db_session):
    """RF008: con justificativo aprobado, el reingreso ubica a la persona en
    el nivel más bajo registrado. Baja simulada vía DB igual que en
    `test_reingreso_requiere_justificativo_aprobado` (ver nota ahí)."""
    from app.dominio.modelos import Ranking

    nivel_alto = _crear_nivel(client, 1, "Elite")
    nivel_bajo = _crear_nivel(client, 5, "Principiantes")
    persona = _crear_persona(client, "1713334455")
    _asignar_nivel(client, persona["id"], nivel_alto["id"])

    ranking = db_session.query(Ranking).filter_by(persona_id=persona["id"]).one()
    ranking.esta_en_ranking = False
    db_session.commit()

    justificativo = client.post(
        f"/api/v1/ranking/{persona['id']}/justificativos",
        json={"anio": 2026, "mes": 8, "motivo": "Lesión"},
    ).json()
    client.patch(
        f"/api/v1/ranking/justificativos/{justificativo['id']}/evaluar", json={"estado": "APROBADO"}
    )

    resp = client.post(f"/api/v1/ranking/{persona['id']}/reingresar")
    assert resp.status_code == 200
    assert resp.json()["nivelRankingId"] == nivel_bajo["id"]


# --- Selección oficial (RF011) -----------------------------------------------
def test_marcar_seleccion_oficial(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1714445566")
    _asignar_nivel(client, persona["id"], nivel["id"])

    resp = client.post(
        "/api/v1/ranking/seleccion-oficial",
        json={"persona_ids": [persona["id"]], "anio": 2026},
    )
    assert resp.status_code == 200
    assert resp.json()[0]["seleccionOficial"] is True
    assert resp.json()[0]["anioSeleccion"] == 2026


# --- Campos de ranking muertos (posición/puntaje) removidos (slice E) -------
# `puntaje_acumulado`/`posicion_actual` dejaron de tener escritor cuando se
# removió `cerrar_mes()` (slice B2). Estos tests prueban que las 3 respuestas
# que los exponían (`/asignaciones`, `/niveles/{id}/tabla`, `/{id}/perfil`) ya
# no los devuelven, en vez de seguir mostrando un dato congelado como si
# estuviera vivo. `/niveles/{id}/tabla` no tenía ningún test previo -- estos
# también cierran ese gap de cobertura.
def test_listado_de_asignaciones_no_expone_posicion_ni_puntaje(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1716667788")
    _asignar_nivel(client, persona["id"], nivel["id"])

    resp = client.get("/api/v1/ranking/asignaciones")
    assert resp.status_code == 200
    fila = resp.json()[0]
    assert "posicionActual" not in fila
    assert "puntajeAcumulado" not in fila
    assert fila["personaId"] == persona["id"]


def test_tabla_de_nivel_no_expone_posicion_ni_puntaje(client):
    nivel = _crear_nivel(client, 2, "Intermedio")
    persona = _crear_persona(client, "1717778899")
    _asignar_nivel(client, persona["id"], nivel["id"])

    resp = client.get(f"/api/v1/ranking/niveles/{nivel['id']}/tabla")
    assert resp.status_code == 200
    fila = resp.json()[0]
    assert "posicionActual" not in fila
    assert "puntajeAcumulado" not in fila
    assert fila["personaId"] == persona["id"]


# --- Perfil privado del alumno (E04-RF012) ----------------------------------
def test_perfil_ranking_visible_para_admin_o_entrenador(client):
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1715556677")
    _asignar_nivel(client, persona["id"], nivel["id"])

    resp = client.get(f"/api/v1/ranking/{persona['id']}/perfil")
    assert resp.status_code == 200
    assert resp.json()["nivelRankingNombre"] == "Elite"


def test_perfil_ranking_no_expone_posicion_ni_puntaje(client):
    """El 'Posición #X · Y pts' que veía el alumno salía de este endpoint
    (`obtener_perfil_alumno`), no de `/niveles/{id}/tabla` como se asumió
    originalmente -- confirmado leyendo el call graph del frontend
    (student-adapter.ts -> GET /ranking/{id}/perfil)."""
    nivel = _crear_nivel(client, 1, "Elite")
    persona = _crear_persona(client, "1718889900")
    _asignar_nivel(client, persona["id"], nivel["id"])

    resp = client.get(f"/api/v1/ranking/{persona['id']}/perfil")
    assert resp.status_code == 200
    body = resp.json()
    assert "posicionActual" not in body
    assert "puntajeAcumulado" not in body
    assert body["nivelRankingNombre"] == "Elite"
    assert body["estaEnRanking"] is True


def test_perfil_ranking_ajeno_rechazado_para_alumno(client_sin_permisos):
    resp = client_sin_permisos.get("/api/v1/ranking/999/perfil")
    assert resp.status_code == 403


# --- Notificaciones -----------------------------------------------------------
def test_marcar_notificacion_ajena_como_leida_falla(client, db_session):
    from app.dominio.modelos import Notificacion
    from app.dominio.enums import TipoNotificacion
    notif = Notificacion(persona_id=999, tipo=TipoNotificacion.JUSTIFICATIVO_APROBADO, mensaje="x")
    db_session.add(notif)
    db_session.commit()
    db_session.refresh(notif)

    resp = client.patch(f"/api/v1/ranking/notificaciones/{notif.id}/leer")
    assert resp.status_code == 403
