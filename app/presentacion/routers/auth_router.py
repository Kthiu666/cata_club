from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.auth_schemas import (
    RegistroUsuarioDTO, RefreshTokenDTO, RefreshResponseDTO, LoginResponseDTO,
    UsuarioMeResponseDTO, LogoutResponseDTO,
    SolicitarRecuperacionDTO, SolicitarRecuperacionResponseDTO, RestablecerContraseniaDTO,
)
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.auth_servicio import AuthServicio

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponseDTO)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(obtener_sesion)):
    return AuthServicio(db).login(form.username, form.password)


@router.post("/registro", status_code=status.HTTP_201_CREATED)
async def registro(datos: RegistroUsuarioDTO, db: Session = Depends(obtener_sesion)):
    """
    Endpoint público: crea el `Usuario` (credenciales) para una `Persona` que
    ya existe. NO crea Persona — el alta de Persona sigue siendo exclusiva
    del ADMINISTRADOR vía POST /personas.
    """
    return AuthServicio(db).registrar_usuario(datos)


@router.get("/me", response_model=UsuarioMeResponseDTO)
async def obtener_perfil(
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
    db: Session = Depends(obtener_sesion),
):
    usuario = AuthServicio(db).obtener_usuario_actual(token_payload["sub"])
    return {
        "correo": usuario.correo,
        "persona_id": usuario.persona_id,
        "nombres": usuario.persona.nombres,
        "apellidos": usuario.persona.apellidos,
        "roles": [rol.tipo_rol.value for rol in usuario.roles],
    }


@router.post("/refresh", response_model=RefreshResponseDTO)
async def refrescar(datos: RefreshTokenDTO, db: Session = Depends(obtener_sesion)):
    """
    Recibe un refresh token en el BODY (no en header Authorization, porque
    el refresh token no es un bearer token de autenticación general). Devuelve
    un nuevo access token válido con los roles actuales del usuario.
    """
    return AuthServicio(db).refrescar_sesion(datos.refresh_token)


@router.post("/logout", response_model=LogoutResponseDTO)
async def logout():
    """
    Dado que los JWT son stateless, este endpoint NO invalida nada en el
    servidor (no hay blacklist de tokens revocados en este alcance). El
    cierre de sesión real ocurre en el frontend (Next.js), al borrar las
    cookies httpOnly que almacenan access_token y refresh_token. Este
    endpoint existe solo para mantener un surface consistente y dar una
    respuesta HTTP predecible, NO para revocar tokens de forma real.

    Limitación documentada (extensión futura): para invalidar tokens antes
    de su expiración natural se necesitaría una blacklist en Redis + rotación
    de refresh tokens (ver `AuthServicio.refrescar_sesion`).
    """
    return {"mensaje": "Sesión finalizada"}


# --- E01-RF003: recuperación de contraseña -----------------------------------
@router.post("/recuperar-contrasenia", response_model=SolicitarRecuperacionResponseDTO)
async def solicitar_recuperacion(datos: SolicitarRecuperacionDTO, db: Session = Depends(obtener_sesion)):
    return AuthServicio(db).solicitar_recuperacion(datos.correo)


@router.post("/restablecer-contrasenia", status_code=status.HTTP_204_NO_CONTENT)
async def restablecer_contrasenia(datos: RestablecerContraseniaDTO, db: Session = Depends(obtener_sesion)):
    AuthServicio(db).restablecer_contrasenia(datos.token, datos.nueva_contrasenia)
