"""
Tests de perfil propio del usuario autenticado (Issue #36).

Cubre:
  - GET /auth/me ahora incluye `telefono` (persona con y sin teléfono).
  - GET /auth/me y PATCH /auth/me ahora incluyen `fechaCreacion` (fecha de
    creación de la cuenta, `Usuario.fecha_creacion`).
  - PATCH /auth/me (nuevo, self-service):
      * Actualiza solo `telefono` -> no reemite tokens.
      * Actualiza `correo` -> reemite access_token/refresh_token (el `sub`
        del JWT es el correo; sin reemisión el usuario quedaría deslogueado).
      * Rechaza correo duplicado (400/EntidadDuplicada) sin persistir nada.
      * Exige autenticación (401 sin token).
  - POST /auth/me/foto (nuevo, self-service): sube/reemplaza la foto de
    perfil propia.
      * JPEG/PNG válidos -> 200, `fotoUrl` actualizado y reflejado en un
        `GET /auth/me` posterior.
      * Tipo MIME no soportado -> 400 limpio (no 500), sin tocar Cloudinary.
      * Archivo que excede el tamaño máximo -> 400 limpio, sin tocar Cloudinary.
      * Exige autenticación (401 sin token).
      * Cuenta suspendida (`activo=False`) no puede subir.
"""
from datetime import date
from unittest.mock import patch

from app.dominio.modelos import Usuario, Rol
from app.dominio.enums import TipoRol
from app.seguridad.gestor_auth import GestorAutenticacion


def _fecha_creacion_iso_esperada(usuario: Usuario) -> str:
    """Formato ISO 8601 real que produce `ResponseBase` para un DTO servido a
    través de FastAPI (`response_model=...`).

    NOTA (gap pre-existente, descubierto en este cambio, fuera de alcance
    arreglar aquí): `ResponseBase._serialize_datetime_utc` (base.py) solo
    agrega el sufijo 'Z' cuando el modelo se serializa en `mode="python"`.
    En el pipeline real de FastAPI (`mode="json"`), pydantic ya convierte el
    datetime naive a string ANTES de que el wrap-serializer corra, así que el
    `isinstance(value, datetime)` deja de matchear y el 'Z' nunca se agrega.
    Se documenta el comportamiento real (sin 'Z') en vez de arreglar
    `base.py`, que afectaría muchos otros DTOs fuera del alcance de esta
    tarea (exponer `fecha_creacion`)."""
    return usuario.fecha_creacion.isoformat()


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


# --- GET /auth/me incluye fechaCreacion --------------------------------------
def test_auth_me_incluye_fecha_creacion(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034267", nombres="Rosa", telefono="0991234567")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    usuario = _crear_usuario_para_persona(db_session, persona, correo="rosa@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="rosa@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200, resp.text
    assert resp.json()["fechaCreacion"] == _fecha_creacion_iso_esperada(usuario)


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


# --- PATCH /auth/me incluye fechaCreacion ------------------------------------
def test_patch_perfil_incluye_fecha_creacion(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034275", nombres="Iván", telefono="0997777777")
    rol_entrenador = Rol(tipo_rol=TipoRol.ENTRENADOR, descripcion="Entrenador")
    usuario = _crear_usuario_para_persona(db_session, persona, correo="ivan@cataclub.com", roles=[rol_entrenador])
    _restaurar_override_token(correo="ivan@cataclub.com", persona_id=persona.id, roles=["ENTRENADOR"])

    resp = client.patch("/api/v1/auth/me", json={"telefono": "0998888888"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["fechaCreacion"] == _fecha_creacion_iso_esperada(usuario)


# --- POST /auth/me/foto -------------------------------------------------------
# Igual criterio de mocking que test_voucher_pago.py: la subida real a
# Cloudinary no está disponible en el entorno de test, así que se mockea
# `app.infraestructura.cloudinary_cliente.subir_foto_perfil` y se prueba solo
# la lógica de validación + persistencia de este módulo.
_FAKE_FOTO_URL_JPG = "https://res.cloudinary.com/test/image/upload/perfil-fake.jpg"
_FAKE_FOTO_URL_PNG = "https://res.cloudinary.com/test/image/upload/perfil-fake.png"


@patch(
    "app.infraestructura.cloudinary_cliente.subir_foto_perfil",
    return_value=_FAKE_FOTO_URL_JPG,
)
def test_subir_foto_perfil_jpg_actualiza_foto_url_y_se_refleja_en_get(_mock_cloudinary, client, db_session):
    persona = _crear_persona(db_session, cedula="1710034283", nombres="Paola", telefono="0991112223")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    _crear_usuario_para_persona(db_session, persona, correo="paola@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="paola@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    contenido = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100  # JPEG-ish
    resp = client.post(
        "/api/v1/auth/me/foto",
        files={"archivo": ("foto.jpg", contenido, "image/jpeg")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["fotoUrl"] == _FAKE_FOTO_URL_JPG

    resp_get = client.get("/api/v1/auth/me")
    assert resp_get.status_code == 200, resp_get.text
    assert resp_get.json()["fotoUrl"] == _FAKE_FOTO_URL_JPG


@patch(
    "app.infraestructura.cloudinary_cliente.subir_foto_perfil",
    return_value=_FAKE_FOTO_URL_PNG,
)
def test_subir_foto_perfil_png_actualiza_foto_url(_mock_cloudinary, client, db_session):
    persona = _crear_persona(db_session, cedula="1710034291", nombres="Renata", telefono="0991112224")
    rol_entrenador = Rol(tipo_rol=TipoRol.ENTRENADOR, descripcion="Entrenador")
    _crear_usuario_para_persona(db_session, persona, correo="renata@cataclub.com", roles=[rol_entrenador])
    _restaurar_override_token(correo="renata@cataclub.com", persona_id=persona.id, roles=["ENTRENADOR"])

    contenido = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100  # PNG-ish
    resp = client.post(
        "/api/v1/auth/me/foto",
        files={"archivo": ("foto.png", contenido, "image/png")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["fotoUrl"] == _FAKE_FOTO_URL_PNG


def test_subir_foto_perfil_tipo_no_permitido_da_400(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034309", nombres="Bruno", telefono="0991112225")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    _crear_usuario_para_persona(db_session, persona, correo="bruno@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="bruno@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    resp = client.post(
        "/api/v1/auth/me/foto",
        files={"archivo": ("archivo.pdf", b"%PDF-1.4\n" + b"\x00" * 100, "application/pdf")},
    )
    assert resp.status_code == 400
    assert "formato" in resp.json()["detail"].lower()


def test_subir_foto_perfil_excede_tamano_maximo_da_400(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034317", nombres="Camila", telefono="0991112226")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    _crear_usuario_para_persona(db_session, persona, correo="camila@cataclub.com", roles=[rol_admin])
    _restaurar_override_token(correo="camila@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    contenido_grande = b"\xff\xd8\xff\xe0" + b"\x00" * (5 * 1024 * 1024 + 1)  # > 5MB
    resp = client.post(
        "/api/v1/auth/me/foto",
        files={"archivo": ("foto.jpg", contenido_grande, "image/jpeg")},
    )
    assert resp.status_code == 400
    assert "tamaño" in resp.json()["detail"].lower()


def test_subir_foto_perfil_requiere_autenticacion(client_sin_token):
    contenido = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100
    resp = client_sin_token.post(
        "/api/v1/auth/me/foto",
        files={"archivo": ("foto.jpg", contenido, "image/jpeg")},
    )
    assert resp.status_code == 401


def test_subir_foto_perfil_cuenta_suspendida_no_puede_subir(client, db_session):
    persona = _crear_persona(db_session, cedula="1710034325", nombres="Diana", telefono="0991112227")
    rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Admin")
    usuario = _crear_usuario_para_persona(db_session, persona, correo="diana@cataclub.com", roles=[rol_admin])
    usuario.activo = False
    db_session.add(usuario)
    db_session.commit()
    _restaurar_override_token(correo="diana@cataclub.com", persona_id=persona.id, roles=["ADMINISTRADOR"])

    contenido = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100
    resp = client.post(
        "/api/v1/auth/me/foto",
        files={"archivo": ("foto.jpg", contenido, "image/jpeg")},
    )
    assert resp.status_code == 401
