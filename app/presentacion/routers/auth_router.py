from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.infraestructura.db import obtener_sesion
from app.dominio.modelos import Usuario
from app.seguridad.gestor_auth import GestorAutenticacion

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(obtener_sesion)):
    usuario = db.query(Usuario).filter(Usuario.correo == form.username).first()
    if not usuario or not GestorAutenticacion.verificar_contrasenia(form.password, usuario.contrasenia):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    roles = [rol.tipo_rol.value for rol in usuario.roles]
    token = GestorAutenticacion.crear_token_acceso(
        {"sub": usuario.correo, "persona_id": usuario.persona_id, "roles": roles}
    )
    return {"access_token": token, "token_type": "bearer"}