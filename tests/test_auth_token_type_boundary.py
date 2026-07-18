"""
Regresión: frontera access/refresh en `GestorAutenticacion.decodificar_token`.

Antes del fix, `decodificar_token` (usado por GET /auth/me y por
`GestorPermisos` en todos los endpoints protegidos) solo verificaba la firma
y expiración del JWT, sin exigir `type=access`. Esto permitía autenticar
cualquier endpoint protegido con un refresh token real (pensado únicamente
para POST /auth/refresh).

Cubre:
  - Un access token real autentica GET /auth/me (happy path, sin override).
  - Un refresh token real usado como Bearer en GET /auth/me -> 401 (el bug).
  - POST /auth/refresh sigue aceptando un refresh token real -> 200 (no
    romper el flujo legítimo al cerrar el gap).
  - Un access token con `exp` en el pasado -> 401 (expirado).
  - Un token corrupto/malformado -> 401.
  - Un JWT válidamente firmado pero SIN el claim `type` -> 401 (no se acepta
    "silenciosamente" solo porque falta el claim).
"""
from datetime import date, datetime, timedelta, timezone

import jwt as pyjwt

from app.dominio.modelos import Usuario
from app.seguridad.gestor_auth import GestorAutenticacion
from app.soporte_transversal.configuracion import settings


def _crear_persona(db_session, cedula="1710035000", nombres="Sara"):
    from app.dominio.modelos import Persona
    p = Persona(
        nombres=nombres, apellidos="Vera", cedula=cedula,
        fecha_nacimiento=date(1992, 3, 4), telefono="0991234567",
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


def _crear_usuario(db_session, persona, correo):
    usuario = Usuario(
        correo=correo,
        contrasenia=GestorAutenticacion.obtener_hash_contrasenia("clave12345"),
        persona_id=persona.id,
    )
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


def _login_real(client_sin_token, correo):
    resp = client_sin_token.post(
        "/api/v1/auth/login", data={"username": correo, "password": "clave12345"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


# --- Happy path: access token real autentica /auth/me -----------------------
def test_access_token_real_autentica_auth_me(client_sin_token, db_session):
    persona = _crear_persona(db_session, cedula="1710035018", nombres="Sara")
    _crear_usuario(db_session, persona, "sara@cataclub.com")

    tokens = _login_real(client_sin_token, "sara@cataclub.com")

    resp = client_sin_token.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["correo"] == "sara@cataclub.com"


# --- El bug: refresh token usado como bearer en endpoint protegido ----------
def test_refresh_token_como_bearer_en_auth_me_da_401(client_sin_token, db_session):
    persona = _crear_persona(db_session, cedula="1710035026", nombres="Iván")
    _crear_usuario(db_session, persona, "ivan@cataclub.com")

    tokens = _login_real(client_sin_token, "ivan@cataclub.com")

    resp = client_sin_token.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
    )
    assert resp.status_code == 401


def test_refresh_token_como_bearer_en_endpoint_con_gestor_permisos_da_401(client_sin_token, db_session):
    """Mismo bug, verificado también en un endpoint detrás de `GestorPermisos`
    (no solo el `Depends` directo de /auth/me), porque ambos comparten
    `decodificar_token`. GET /asistencias/horarios usa `Depends` directo, no
    `GestorPermisos` — GET /tesoreria/eventos sí exige `GestorPermisos` y no
    requiere body, así que ejercita ese camino sin ambigüedad."""
    persona = _crear_persona(db_session, cedula="1710035034", nombres="Nora")
    _crear_usuario(db_session, persona, "nora@cataclub.com")

    tokens = _login_real(client_sin_token, "nora@cataclub.com")

    resp = client_sin_token.get(
        "/api/v1/tesoreria/eventos",
        headers={"Authorization": f"Bearer {tokens['refresh_token']}"},
    )
    assert resp.status_code == 401


# --- /auth/refresh sigue funcionando con un refresh token genuino ----------
def test_refresh_endpoint_sigue_aceptando_refresh_token_real(client_sin_token, db_session):
    persona = _crear_persona(db_session, cedula="1710035042", nombres="Boris")
    _crear_usuario(db_session, persona, "boris@cataclub.com")

    tokens = _login_real(client_sin_token, "boris@cataclub.com")

    resp = client_sin_token.post(
        "/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    # RefreshResponseDTO no expone refresh_token (el response_model filtra
    # cualquier campo extra que la capa de servicio pudiera llegar a incluir).
    assert "refresh_token" not in body


# --- Expirado, malformado o sin claim `type` -> 401 (no regresión) ----------
def test_access_token_expirado_da_401(client_sin_token):
    token_expirado = GestorAutenticacion.crear_token_acceso(
        {"sub": "x@cataclub.com"}, expiracion_minutos=-1,
    )
    resp = client_sin_token.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_expirado}"},
    )
    assert resp.status_code == 401


def test_access_token_malformado_da_401(client_sin_token):
    resp = client_sin_token.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer esto-no-es-un-jwt"},
    )
    assert resp.status_code == 401


def test_token_firmado_sin_claim_type_da_401(client_sin_token):
    """Un JWT con firma válida pero sin el claim `type` no debe aceptarse
    "silenciosamente": se trata igual que un token inválido."""
    payload = {
        "sub": "sin-type@cataclub.com",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
    token_sin_type = pyjwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algoritmo,
    )
    resp = client_sin_token.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_sin_type}"},
    )
    assert resp.status_code == 401
