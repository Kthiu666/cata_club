def test_crear_persona_sin_rol_administrador_da_403(client_sin_permisos):
    resp = client_sin_permisos.post(
        "/api/v1/personas/",
        json={
            "nombres": "Ana", "apellidos": "Torres", "cedula": "1710034065",
            "fecha_nacimiento": "2010-05-14", "telefono": "0991234567",
        },
    )
    assert resp.status_code == 403


def test_listar_personas_no_requiere_rol_especifico(client_sin_permisos):
    """GET de listado es de lectura general; solo las mutaciones exigen ADMINISTRADOR."""
    resp = client_sin_permisos.get("/api/v1/personas/")
    assert resp.status_code == 200
