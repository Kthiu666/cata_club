def _crear_persona(client, cedula="1710034065"):
    return client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Ana", "apellidos": "Torres", "cedula": cedula,
            "fecha_nacimiento": "2010-05-14", "telefono": "0991234567",
        },
    ).json()


def test_crear_y_obtener_ficha_medica(client):
    persona = _crear_persona(client)
    resp = client.post(
        "/api/v1/fichas-medicas/",
        json={"tipo_sangre": "O_POSITIVO", "persona_id": persona["id"], "enfermedades": ["Asma"]},
    )
    assert resp.status_code == 201
    assert resp.json()["tipo_sangre"] == "O_POSITIVO"
    assert [e["nombre_enfermedad"] for e in resp.json()["enfermedades"]] == ["Asma"]

    resp = client.get(f"/api/v1/fichas-medicas/persona/{persona['id']}")
    assert resp.status_code == 200
    assert resp.json()["persona_id"] == persona["id"]


def test_actualizar_tipo_sangre(client):
    """Gap 3: antes no existía forma de corregir la ficha médica ya creada."""
    persona = _crear_persona(client)
    client.post(
        "/api/v1/fichas-medicas/",
        json={"tipo_sangre": "O_POSITIVO", "persona_id": persona["id"], "enfermedades": []},
    )

    resp = client.patch(
        f"/api/v1/fichas-medicas/persona/{persona['id']}",
        json={"tipo_sangre": "AB_NEGATIVO"},
    )
    assert resp.status_code == 200
    assert resp.json()["tipo_sangre"] == "AB_NEGATIVO"


def test_actualizar_enfermedades_reemplaza_la_lista_completa(client):
    persona = _crear_persona(client)
    client.post(
        "/api/v1/fichas-medicas/",
        json={"tipo_sangre": "O_POSITIVO", "persona_id": persona["id"], "enfermedades": ["Asma"]},
    )

    resp = client.patch(
        f"/api/v1/fichas-medicas/persona/{persona['id']}",
        json={"enfermedades": ["Diabetes", "Hipertensión"]},
    )
    assert resp.status_code == 200
    nombres = sorted(e["nombre_enfermedad"] for e in resp.json()["enfermedades"])
    assert nombres == ["Diabetes", "Hipertensión"]

    # Confirma que "Asma" ya no quedó huérfana en la BD (cascade delete-orphan).
    resp = client.get(f"/api/v1/fichas-medicas/persona/{persona['id']}")
    nombres = [e["nombre_enfermedad"] for e in resp.json()["enfermedades"]]
    assert "Asma" not in nombres


def test_actualizar_ficha_medica_inexistente_da_404(client):
    resp = client.patch("/api/v1/fichas-medicas/persona/999", json={"tipo_sangre": "O_POSITIVO"})
    assert resp.status_code == 404


def test_actualizar_ficha_medica_requiere_admin(client_sin_permisos):
    resp = client_sin_permisos.patch(
        "/api/v1/fichas-medicas/persona/1", json={"tipo_sangre": "O_POSITIVO"}
    )
    assert resp.status_code == 403
