"""Tests del módulo de Tesorería (E04-RF009/RF010/RF011/RF012) -- épica
entera que no existía en el backend (ni el rol TESORERO, ni las entidades)."""


def _crear_evento(client, nombre="Rifa anual"):
    return client.post(
        "/api/v1/tesoreria/eventos",
        json={"nombre": nombre, "descripcion": "Recaudación", "fecha_inicio": "2026-07-01", "meta_monto": "500.00"},
    ).json()


def test_crear_evento_requiere_admin_o_tesorero(client_sin_permisos):
    resp = client_sin_permisos.post(
        "/api/v1/tesoreria/eventos",
        json={"nombre": "Rifa", "fecha_inicio": "2026-07-01"},
    )
    assert resp.status_code == 403


def test_crear_evento_con_solo_tesorero_da_403(client_tesorero):
    """El rol TESORERO está dado de baja: un token que solo tiene ese rol
    ya no debe pasar GestorPermisos, aunque antes sí lo hacía."""
    resp = client_tesorero.post(
        "/api/v1/tesoreria/eventos",
        json={"nombre": "Rifa", "fecha_inicio": "2026-07-01"},
    )
    assert resp.status_code == 403


def test_crear_evento_y_listar(client):
    evento = _crear_evento(client)
    assert evento["nombre"] == "Rifa anual"
    resp = client.get("/api/v1/tesoreria/eventos")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_registrar_movimientos_y_balance_de_evento(client):
    evento = _crear_evento(client)
    client.post(
        f"/api/v1/tesoreria/eventos/{evento['id']}/movimientos",
        json={"tipo": "INGRESO", "monto": "300.00", "fecha": "2026-07-05", "descripcion": "Venta de rifas"},
    )
    client.post(
        f"/api/v1/tesoreria/eventos/{evento['id']}/movimientos",
        json={"tipo": "EGRESO", "monto": "50.00", "fecha": "2026-07-06", "descripcion": "Impresión de boletos"},
    )

    resp = client.get(f"/api/v1/tesoreria/eventos/{evento['id']}/balance")
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalIngresos"] == "300.00"
    assert body["totalEgresos"] == "50.00"
    assert body["balance"] == "250.00"


def test_movimiento_en_evento_inexistente_da_404(client):
    resp = client.post(
        "/api/v1/tesoreria/eventos/999/movimientos",
        json={"tipo": "INGRESO", "monto": "10.00", "fecha": "2026-07-05"},
    )
    assert resp.status_code == 404


def test_crear_egreso_requiere_admin(client_sin_permisos):
    resp = client_sin_permisos.post(
        "/api/v1/tesoreria/egresos",
        json={"concepto": "Pelotas nuevas", "categoria": "implementos", "monto": "80.00", "fecha": "2026-07-01"},
    )
    assert resp.status_code == 403


def test_balance_general_combina_pagos_eventos_y_egresos(client):
    persona = client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Ana", "apellidos": "Ruiz", "cedula": "1712121212",
            "fecha_nacimiento": "2000-01-01", "telefono": "0991234567",
        },
    ).json()
    tipo = client.post(
        "/api/v1/membresias/tipos",
        json={"categoria": "adulto", "franja_horaria": "mañana", "modalidad": "MENSUAL", "precio": "40.00"},
    ).json()
    membresia = client.post(
        "/api/v1/membresias/",
        json={"monto_aplicado": "40.00", "persona_id": persona["id"], "tipo_membresia_id": tipo["id"]},
    ).json()
    pago = client.post(
        "/api/v1/membresias/pagos",
        json={
            "monto": "40.00", "tipo_pago": "EFECTIVO",
            "fecha_inicio": "2026-07-01", "fecha_fin": "2026-07-31",
            "persona_id": persona["id"], "membresia_id": membresia["id"],
        },
    ).json()
    client.patch(f"/api/v1/membresias/pagos/{pago['id']}/validar", json={"estado_pago": "APROBADO"})

    evento = _crear_evento(client)
    client.post(
        f"/api/v1/tesoreria/eventos/{evento['id']}/movimientos",
        json={"tipo": "INGRESO", "monto": "100.00", "fecha": "2026-07-05"},
    )
    client.post(
        "/api/v1/tesoreria/egresos",
        json={"concepto": "Luz", "categoria": "servicios", "monto": "20.00", "fecha": "2026-07-01"},
    )

    resp = client.get("/api/v1/tesoreria/balance-general")
    assert resp.status_code == 200
    body = resp.json()
    assert body["totalIngresosMembresias"] == "40.00"
    assert body["totalIngresosEventos"] == "100.00"
    assert body["totalEgresosGenerales"] == "20.00"
    assert body["balanceNeto"] == "120.00"


def test_balance_general_pdf_se_descarga(client):
    resp = client.get("/api/v1/tesoreria/balance-general/pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:4] == b"%PDF"
