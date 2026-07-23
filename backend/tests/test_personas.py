def _payload_persona(cedula="1710034065"):
    return {
        "nombres": "Ana",
        "apellidos": "Torres",
        "cedula": cedula,
        "fecha_nacimiento": "2010-05-14",
        "telefono": "0991234567",
    }


def test_registrar_persona(client):
    resp = client.post("/api/v1/personas/", json=_payload_persona())
    assert resp.status_code == 201
    data = resp.json()
    assert data["cedula"] == "1710034065"
    assert data["id"] > 0


def test_no_permite_cedula_duplicada(client):
    client.post("/api/v1/personas/", json=_payload_persona())
    resp = client.post("/api/v1/personas/", json=_payload_persona())
    assert resp.status_code == 400
    assert "cédula" in resp.json()["detail"]


def test_obtener_persona_inexistente_da_404(client):
    resp = client.get("/api/v1/personas/999")
    assert resp.status_code == 404


def test_representante_reflexivo(client):
    representante = client.post("/api/v1/personas/", json=_payload_persona("1710034065")).json()
    hijo = client.post(
        "/api/v1/personas/",
        json={**_payload_persona("1710034073"), "representante_id": representante["id"]},
    ).json()

    resp = client.get(f"/api/v1/personas/{representante['id']}/representados")
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert hijo["id"] in ids


def test_actualizar_y_eliminar_persona(client):
    persona = client.post("/api/v1/personas/", json=_payload_persona()).json()

    resp = client.patch(f"/api/v1/personas/{persona['id']}", json={"telefono": "0987654321"})
    assert resp.status_code == 200
    assert resp.json()["telefono"] == "0987654321"

    resp = client.delete(f"/api/v1/personas/{persona['id']}")
    assert resp.status_code == 204

    resp = client.get(f"/api/v1/personas/{persona['id']}")
    assert resp.status_code == 404
