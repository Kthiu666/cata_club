from datetime import date

from app.dominio.enums import TipoRol
from app.dominio.modelos import Persona, Rol, Usuario
from tests.conftest import crear_entrenador


def _crear_persona_con_rol(db_session, cedula: str, tipo_rol: TipoRol) -> int:
    """Crea una persona con un `Usuario`/`Rol` DISTINTO a ENTRENADOR y
    devuelve su persona_id. Usado para probar que `/personas/entrenadores`
    realmente filtra por `tipo_rol == ENTRENADOR` (INNER JOIN por rol), no
    solo por tener o no tener un `Usuario` asociado — de lo contrario un
    filtro roto que devolviera "cualquier persona con cualquier rol" pasaría
    el test igual."""
    persona = Persona(
        nombres="Marta", apellidos="Salazar", cedula=cedula,
        fecha_nacimiento=date(1985, 3, 20), telefono="0993334444",
    )
    db_session.add(persona)
    db_session.flush()
    rol = Rol(tipo_rol=tipo_rol, descripcion=tipo_rol.value)
    usuario = Usuario(
        correo=f"otrorol{cedula}@cataclub.test",
        contrasenia="hash", persona_id=persona.id, roles=[rol],
    )
    db_session.add(usuario)
    db_session.commit()
    return persona.id


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


# --- GET /personas/entrenadores: selector real de entrenador (dropdown) ----
def test_listar_entrenadores_devuelve_solo_personas_con_rol_entrenador(client, db_session):
    entrenador_id = crear_entrenador(db_session, "1710034065")
    # Persona CON Usuario/Rol pero de un rol distinto (ADMINISTRADOR) — sin
    # esta fixture, el test pasaría igual aunque el filtro de rol estuviera
    # roto (ej. si `listar_por_rol` devolviera cualquier persona con
    # cualquier rol asignado, no solo ENTRENADOR), porque la única otra
    # persona ("alumno" abajo) queda excluida solo por no tener Usuario.
    administrador_id = _crear_persona_con_rol(db_session, "1710034081", TipoRol.ADMINISTRADOR)
    alumno = client.post("/api/v1/personas/", json=_payload_persona("1710034073")).json()

    resp = client.get("/api/v1/personas/entrenadores")
    assert resp.status_code == 200
    data = resp.json()
    ids = [e["id"] for e in data]
    assert entrenador_id in ids
    assert administrador_id not in ids
    assert alumno["id"] not in ids
    entrenador = next(e for e in data if e["id"] == entrenador_id)
    assert entrenador["nombreCompleto"] == "Carlos Ruiz"


def test_listar_entrenadores_vacio_cuando_no_hay_ninguno(client):
    resp = client.get("/api/v1/personas/entrenadores")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_entrenadores_requiere_autenticacion(client_sin_token):
    resp = client_sin_token.get("/api/v1/personas/entrenadores")
    assert resp.status_code == 401

