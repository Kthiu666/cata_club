from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.infraestructura.db import obtener_sesion
from app.presentacion.schemas.auth_schemas import (
    RegistroUsuarioDTO, RefreshTokenDTO, UsuarioMeResponseDTO, LogoutResponseDTO,
    SolicitarRecuperacionDTO, SolicitarRecuperacionResponseDTO, RestablecerContraseniaDTO,
    ActualizarPerfilPropioDTO, ActualizarPerfilPropioResponseDTO,
)
from app.seguridad.gestor_auth import GestorAutenticacion
from app.servicios_negocio.auth_servicio import AuthServicio
from app.soporte_transversal.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(obtener_sesion)):
    return AuthServicio(db).login(form.username, form.password)


@router.post("/registro", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def registro(request: Request, datos: RegistroUsuarioDTO, db: Session = Depends(obtener_sesion)):
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
        "telefono": usuario.persona.telefono,
    }


# --- Issue #36: perfil propio (self-service, cualquier rol autenticado) -----
@router.patch("/me", response_model=ActualizarPerfilPropioResponseDTO)
async def actualizar_perfil_propio(
    cambios: ActualizarPerfilPropioDTO,
    token_payload: dict = Depends(GestorAutenticacion.decodificar_token),
    db: Session = Depends(obtener_sesion),
):
    """
    Self-service: el usuario autenticado edita SU PROPIO correo/teléfono.
    Se resuelve la identidad vía el `sub` del JWT (no vía un persona_id de
    path param), de modo que un usuario nunca pueda editar el registro de
    otro. Distinto del edit-completo de ADMINISTRADOR (`PUT /personas/{id}`),
    que sigue existiendo sin cambios para cualquier persona.
    """
    return AuthServicio(db).actualizar_perfil_propio(token_payload["sub"], cambios)


@router.post("/refresh")
@limiter.limit("10/minute")
async def refrescar(request: Request, datos: RefreshTokenDTO, db: Session = Depends(obtener_sesion)):
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
@limiter.limit("3/minute")
async def solicitar_recuperacion(request: Request, datos: SolicitarRecuperacionDTO, db: Session = Depends(obtener_sesion)):
    return AuthServicio(db).solicitar_recuperacion(datos.correo)


@router.post("/restablecer-contrasenia", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def restablecer_contrasenia(request: Request, datos: RestablecerContraseniaDTO, db: Session = Depends(obtener_sesion)):
    AuthServicio(db).restablecer_contrasenia(datos.token, datos.nueva_contrasenia)
