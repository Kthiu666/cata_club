"""
Tests de perfil propio del usuario autenticado (Issue #36).

Cubre:
  - GET /auth/me ahora incluye `telefono` (persona con y sin teléfono).
  - PATCH /auth/me (nuevo, self-service):
      * Actualiza solo `telefono` -> no reemite tokens.
      * Actualiza `correo` -> reemite access_token/refresh_token (el `sub`
        del JWT es el correo; sin reemisión el usuario quedaría deslogueado).
      * Rechaza correo duplicado (400/EntidadDuplicada) sin persistir nada.
      * Exige autenticación (401 sin token).
"""
from datetime import date

from app.dominio.modelos import Usuario, Rol
from app.dominio.enums import TipoRol
from app.seguridad.gestor_auth import GestorAutenticacion


# --- helpers (mismo patrón que test_auth_registro_refresh.py) ---------------
def _crear_persona(db_session, cedula="1710034065", nombres="Ana", telefono="0991234567"):
    from app.dominio.modelos import Persona
    p = Persona(
        nombres=nombres, apellidos="Torres", cedula=cedula,
        fecha_nacimiento=date(1990, 1, 1), telefono=telefono,
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


def _crear_usuario_para_persona(db_session, persona, correo=None, roles=None):
    usuario = Usuario(
        correo=correo or f"{persona.cedula}@cataclub.com",
        contrasenia=GestorAutenticacion.obtener_hash_contrasenia("clave12345"),
        persona_id=persona.id,
    )
    if roles:
        for r in roles:
            usuario.roles.append(r)
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


def _restaurar_override_token(correo="user@cataclub.test", persona_id=1, roles=None):
    from main import app
    app.dependency_overrides[GestorAutenticacion.decodificar_token] = lambda: {
        "sub": correo, "persona_id": persona_id, "roles": roles or [],
    }


# --- GET /auth/me incluye telefono ------------------------------------------
def test_auth_me_incluye_telefono(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034200", nombres="Lucía", telefono="0991234567")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    _crear_usuario_para_persona(db_session, persona, correo="lucia2@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="lucia2@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200, resp.text
    assert resp.json()["telefono"] == "0991234567"


def test_auth_me_telefono_vacio_si_persona_sin_telefono(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034218", nombres="Marta", telefono="")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    _crear_usuario_para_persona(db_session, persona, correo="marta@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="marta@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200, resp.text
    assert resp.json()["telefono"] == ""


# --- PATCH /auth/me -----------------------------------------------------------
def test_patch_perfil_actualiza_telefono_sin_reemitir_tokens(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034226", nombres="Sofía", telefono="0991111111")
    rol_entrenador = Rol(tipo_rol=TipoRol.ENTRENADOR, descripcion="Entrenador")
    _crear_usuario_para_persona(db_session, persona, correo="sofia@cataclub.com", roles=[rol_entrenador])
    _restaurar_override_token(correo="sofia@cataclub.com", persona_id=persona.id, roles=["ENTRENADOR"])

    resp = client.patch("/api/v1/auth/me", json={"telefono": "0992222222"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["telefono"] == "0992222222"
    assert body["correo"] == "sofia@cataclub.com"
    assert not body.get("accessToken")
    assert not body.get("refreshToken")

    db_session.refresh(persona)
    assert persona.telefono == "0992222222"


def test_patch_perfil_actualiza_correo_reemite_tokens(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034234", nombres="Diego", telefono="0993333333")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    usuario = _crear_usuario_para_persona(db_session, persona, correo="diego.viejo@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="diego.viejo@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    resp = client.patch("/api/v1/auth/me", json={"correo": "diego.nuevo@cataclub.com"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["correo"] == "diego.nuevo@cataclub.com"
    assert body.get("accessToken")
    assert body.get("refreshToken")

    db_session.refresh(usuario)
    assert usuario.correo == "diego.nuevo@cataclub.com"


def test_patch_perfil_rechaza_correo_duplicado(client, db_session):
    persona_ocupada = _crear_persona(db_session, cedula="1710034242", nombres="Carla", telefono="0994444444")
    _crear_usuario_para_persona(db_session, persona_ocupada, correo="ocupado@cataclub.com")

    persona_propia = _crear_persona(db_session, cedula="1710034259", nombres="Elena", telefono="0995555555")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    usuario_propio = _crear_usuario_para_persona(
        db_session, persona_propia, correo="elena@cataclub.com", roles=[rol_admin],
    )
    _restaurar_override_token(correo="elena@cataclub.com", persona_id=persona_propia.id, roles=["ADMINISTRADOR"])

    resp = client.patch("/api/v1/auth/me", json={"correo": "ocupado@cataclub.com"})
    assert resp.status_code == 400
    assert "correo" in resp.json()["detail"].lower()

    db_session.refresh(usuario_propio)
    assert usuario_propio.correo == "elena@cataclub.com"


def test_patch_perfil_requiere_autenticacion(client_sin_token):
    resp = client_sin_token.patch("/api/v1/auth/me", json={"telefono": "0996666666"})
    assert resp.status_code == 401
