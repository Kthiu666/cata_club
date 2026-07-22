from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

from app.soporte_transversal.configuracion import settings
from app.dominio.excepciones import CredencialesInvalidas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class GestorAutenticacion:
    """Encapsula el hashing de contraseñas y la emisión/validación de JWT."""

    @staticmethod
    def obtener_hash_contrasenia(contrasenia: str) -> str:
        return pwd_context.hash(contrasenia)

    @staticmethod
    def verificar_contrasenia(contrasenia_plana: str, contrasenia_hash: str) -> bool:
        return pwd_context.verify(contrasenia_plana, contrasenia_hash)

    @staticmethod
    def crear_token_acceso(datos: dict, expiracion_minutos: Optional[int] = None) -> str:
        payload = datos.copy()
        # El claim `type` distingue un access token de un refresh token;
        # el endpoint /auth/refresh valida que lo que recibe sea `type=refresh`.
        payload["type"] = "access"
        expira = datetime.now(timezone.utc) + timedelta(
            minutes=expiracion_minutos or settings.jwt_expira_minutos
        )
        payload.update({"exp": expira})
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algoritmo)

    @staticmethod
    def crear_token_refresco(datos: dict) -> str:
        """Emite un refresh token (vida larga, type=refresh). Sirve únicamente
        para pedir un nuevo access token vía /auth/refresh; NO se usa para
        autenticar requests a endpoints de negocio (eso requiere access token)."""
        payload = datos.copy()
        payload["type"] = "refresh"
        expira = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expira_dias)
        payload.update({"exp": expira})
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algoritmo)

    # --- E01-RF003: recuperación de contraseña -------------------------------
    @staticmethod
    def crear_token_recuperacion(correo: str, version_contrasenia: int, expiracion_minutos: int = 30) -> str:
        """Token de un solo propósito (`type=reset_password`), corta duración
        (30 min por defecto). Incluye la versión actual de la contraseña para
        invalidar el token tras un restablecimiento exitoso (single-use)."""
        payload = {
            "sub": correo,
            "type": "reset_password",
            "ver": version_contrasenia,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=expiracion_minutos),
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algoritmo)

    @staticmethod
    def decodificar_token_recuperacion(token: str) -> dict:
        """Devuelve el payload {sub, ver} si el token es válido y de tipo
        reset_password. La comparación contra la versión actual de la
        contraseña del usuario se hace en el servicio, para invalidar tokens
        reutilizados (single-use) tras un restablecimiento exitoso."""
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algoritmo])
        except jwt.PyJWTError:
            raise CredencialesInvalidas("El enlace de recuperación es inválido o expiró")
        if payload.get("type") != "reset_password":
            raise CredencialesInvalidas("El enlace de recuperación es inválido o expiró")
        return payload

    @staticmethod
    def decodificar_token(token: str = Depends(oauth2_scheme)) -> dict:
        try:
            return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algoritmo])
        except jwt.PyJWTError:
            raise CredencialesInvalidas("Token inválido o expirado")
