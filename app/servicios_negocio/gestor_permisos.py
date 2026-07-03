from fastapi import Depends, HTTPException, status

from app.seguridad.gestor_auth import GestorAutenticacion


class GestorPermisos:
    """
    Dependencia parametrizable de FastAPI para exigir uno o varios roles.
    Uso: dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))]
    """

    def __init__(self, roles_requeridos: list[str]):
        self.roles_requeridos = roles_requeridos

    def __call__(self, token_payload: dict = Depends(GestorAutenticacion.decodificar_token)) -> dict:
        roles_usuario = token_payload.get("roles", [])
        if not any(rol in self.roles_requeridos for rol in roles_usuario):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permisos insuficientes para esta operación",
            )
        return token_payload
