from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.soporte_transversal.configuracion import settings

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
        expira = datetime.now(timezone.utc) + timedelta(
            minutes=expiracion_minutos or settings.jwt_expira_minutos
        )
        payload.update({"exp": expira})
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algoritmo)

    @staticmethod
    def decodificar_token(token: str = Depends(oauth2_scheme)) -> dict:
        try:
            return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algoritmo])
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
