from app.seguridad.gestor_auth import GestorAutenticacion


def _crear_persona(client, cedula="1710034065"):
    return client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Ana", "apellidos": "Torres", "cedula": cedula,
            "fecha_nacimiento": "2010-05-14", "telefono": "0991234567",
        },
    ).json()


def _crear_tipo_membresia(client, modalidad="MENSUAL"):
    return client.post(
        "/api/v1/membresias/tipos",
        json={
            "categoria": "Adultos", "franja_horaria": "18:00-19:00",
            "precio": "35.00", "modalidad": modalidad,
        },
    ).json()


def test_membresia_nace_inactiva_no_pendiente_pago(client):
    """Corrección D11: el estado inicial ya NO es PENDIENTE_PAGO (ese
    concepto pertenece a Pago), sino INACTIVA."""
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)

    resp = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    )
    assert resp.status_code == 201
    assert resp.json()["estado"] == "INACTIVA"


def test_registrar_pago_ajeno_da_403(client_sin_permisos):
    """Gap: un usuario ALUMNO (persona_id=1 según el fixture) no puede
    registrar un pago a nombre de otra persona (persona_id=999)."""
    resp = client_sin_permisos.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": 999, "membresia_id": 1,
        },
    )
    assert resp.status_code == 403


def test_registrar_pago_propio_no_requiere_admin(client_sin_permisos):
    """El dueño (persona_id=1, igual al persona_id del token) sí puede
    registrar su propio pago aunque no sea ADMINISTRADOR."""
    resp = client_sin_permisos.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": 1, "membresia_id": 999999,
        },
    )
    assert resp.status_code == 404  # no 403: la autorización sí pasó


def test_pago_aprobado_activa_membresia(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()

    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "TRANSFERENCIA",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()
    assert pago["estadoPago"] == "PENDIENTE_VALIDACION"

    resp = client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "APROBADO"},
    )
    assert resp.status_code == 200

    membresia_actualizada = client.get(f"/api/v1/membresias/{membresia['id']}").json()
    assert membresia_actualizada["estado"] == "ACTIVA"


def test_rechazar_pago_sin_motivo_falla(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()

    resp = client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "RECHAZADO"},
    )
    assert resp.status_code == 422


def test_rechazar_pago_con_motivo_solo_espacios_falla(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()

    resp = client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "RECHAZADO", "motivo_rechazo": "   "},
    )
    assert resp.status_code == 422


def test_rechazar_pago_con_motivo_valido_persiste(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()

    resp = client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "RECHAZADO", "motivo_rechazo": "Comprobante ilegible"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["estadoPago"] == "RECHAZADO"
    assert body["motivoRechazo"] == "Comprobante ilegible"


def test_aprobar_pago_sin_motivo_rechazo_funciona(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()

    resp = client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "APROBADO"},
    )
    assert resp.status_code == 200
    assert resp.json()["estadoPago"] == "APROBADO"


def test_pago_rechazado_no_reutiliza_estado_de_membresia(client):
    """Corrección D11: rechazar un pago NO debe forzar la membresía a un
    estado que en realidad pertenece al ciclo de vida de Pago."""
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()

    client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "RECHAZADO", "motivo_rechazo": "Comprobante ilegible"},
    )

    membresia_actualizada = client.get(f"/api/v1/membresias/{membresia['id']}").json()
    assert membresia_actualizada["estado"] == "INACTIVA"
    assert "PENDIENTE_PAGO" not in [membresia_actualizada["estado"]]


# --- GET /membresias/pagos (cola de validación) -----------------------------
def test_listar_pagos_incluye_nombre_de_persona(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    )

    resp = client.get("/api/v1/membresias/pagos")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["personaNombreCompleto"] == "Ana Torres"
    assert body["items"][0]["estadoPago"] == "PENDIENTE_VALIDACION"


def test_listar_pagos_filtra_por_estado(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()
    client.patch(f"/api/v1/membresias/pagos/{pago['id']}/validar", json={"estado_pago": "APROBADO"})

    resp = client.get("/api/v1/membresias/pagos", params={"estado_pago": "PENDIENTE_VALIDACION"})
    assert resp.status_code == 200
    assert resp.json()["items"] == []

    resp = client.get("/api/v1/membresias/pagos", params={"estado_pago": "APROBADO"})
    assert resp.json()["total"] == 1


def test_listar_pagos_requiere_admin(client_sin_permisos):
    resp = client_sin_permisos.get("/api/v1/membresias/pagos")
    assert resp.status_code == 403


def test_estadisticas_membresias_cuenta_solo_activas(client):
    persona = _crear_persona(client)
    tipo = _crear_tipo_membresia(client)
    membresia_activa = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    )
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO", "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia_activa["id"],
        },
    ).json()
    client.patch(f"/api/v1/membresias/pagos/{pago['id']}/validar", json={"estado_pago": "APROBADO"})

    response = client.get("/api/v1/membresias/estadisticas")

    assert response.status_code == 200
    assert response.json() == {"activeMemberships": 1}


def test_estadisticas_membresias_requiere_admin(client_sin_permisos):
    response = client_sin_permisos.get("/api/v1/membresias/estadisticas")

    assert response.status_code == 403


# --- GET /membresias/pagos/persona/{persona_id} (historial propio) ----------
def test_alumno_ve_su_propio_historial_de_pagos_incluyendo_rechazado_con_motivo(client):
    """`client` autentica como persona_id=1; al ser la primera persona creada
    en una BD limpia, ésta recibe id=1, con lo que queda siendo "la propia"
    desde la perspectiva del token (mismo truco que test_ranking.py)."""
    persona = _crear_persona(client)
    assert persona["id"] == 1
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()
    client.patch(
        f"/api/v1/membresias/pagos/{pago['id']}/validar",
        json={"estado_pago": "RECHAZADO", "motivo_rechazo": "Comprobante ilegible"},
    )

    resp = client.get(f"/api/v1/membresias/pagos/persona/{persona['id']}")
    assert resp.status_code == 200
    historial = resp.json()
    assert len(historial) == 1
    assert historial[0]["estadoPago"] == "RECHAZADO"
    assert historial[0]["motivoRechazo"] == "Comprobante ilegible"


def test_representante_ve_los_pagos_de_su_representado(client_sin_permisos, client):
    """Esquema (igual que test_voucher_pago.py): se crea todo con `client`
    (admin) y luego se restaura el token de `client_sin_permisos` (persona_id=1,
    rol ALUMNO, sin ADMINISTRADOR) para que la autorización dependa
    exclusivamente del vínculo representante_id, no de un bypass admin."""
    representante = _crear_persona(client, cedula="1733344455")
    assert representante["id"] == 1
    alumno = client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Hijo", "apellidos": "Representado", "cedula": "1744455566",
            "fecha_nacimiento": "2015-05-14", "telefono": "0991234567",
            "representante_id": representante["id"],
        },
    ).json()
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": alumno["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": alumno["id"], "membresia_id": membresia["id"],
        },
    )

    from main import app
    app.dependency_overrides[GestorAutenticacion.decodificar_token] = lambda: {
        "sub": "alumno@cataclub.test", "persona_id": 1, "roles": ["ALUMNO"],
    }

    resp = client_sin_permisos.get(f"/api/v1/membresias/pagos/persona/{alumno['id']}")
    assert resp.status_code == 200
    historial = resp.json()
    assert len(historial) == 1
    assert historial[0]["personaId"] == alumno["id"]


def test_admin_puede_listar_pagos_de_cualquier_persona(client):
    persona = _crear_persona(client, cedula="1799999997")
    tipo = _crear_tipo_membresia(client)
    membresia = client.post(
        "/api/v1/membresias/",
        json={
            "monto_aplicado": "35.00", "fecha_activacion": "2026-07-01T00:00:00",
            "persona_id": persona["id"], "tipo_membresia_id": tipo["id"],
        },
    ).json()
    client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "35.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    )

    resp = client.get(f"/api/v1/membresias/pagos/persona/{persona['id']}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_persona_sin_relacion_no_puede_ver_historial_de_pagos_ajeno(client_sin_permisos, client):
    """POST /personas/ es admin-only, así que las personas se crean con
    `client` y luego se restaura el token de `client_sin_permisos` (persona_id=1,
    rol ALUMNO) antes de la petición que se evalúa -- mismo truco que
    `test_voucher_pago.py::test_subir_voucher_sin_ser_duenio_ni_admin_da_403`.
    Relleno para que `otra_persona` no quede con id=1."""
    _crear_persona(client, cedula="1700000002")
    otra_persona = _crear_persona(client, cedula="1799999996")

    from main import app
    app.dependency_overrides[GestorAutenticacion.decodificar_token] = lambda: {
        "sub": "alumno@cataclub.test", "persona_id": 1, "roles": ["ALUMNO"],
    }

    resp = client_sin_permisos.get(f"/api/v1/membresias/pagos/persona/{otra_persona['id']}")
    assert resp.status_code == 403


def test_historial_de_pagos_vacio_cuando_no_hay(client):
    persona = _crear_persona(client, cedula="1755566677")

    resp = client.get(f"/api/v1/membresias/pagos/persona/{persona['id']}")
    assert resp.status_code == 200
    assert resp.json() == []
