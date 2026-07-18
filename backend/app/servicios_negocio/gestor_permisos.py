from fastapi import Depends

from app.seguridad.gestor_auth import GestorAutenticacion
from app.dominio.excepciones import PermisosInsuficientes


class GestorPermisos:
    """
    Dependencia parametrizable de FastAPI para exigir uno o varios roles.
    Uso: dependencies=[Depends(GestorPermisos(["ADMINISTRADOR"]))]

    Lanza una excepción de dominio (no HTTPException) para mantener esta capa
    libre de detalles HTTP; el manejador global en main.py la traduce a 403.
    """

    def __init__(self, roles_requeridos: list[str]):
        self.roles_requeridos = roles_requeridos

    def __call__(self, token_payload: dict = Depends(GestorAutenticacion.decodificar_token)) -> dict:
        roles_usuario = token_payload.get("roles", [])
        if not any(rol in self.roles_requeridos for rol in roles_usuario):
            raise PermisosInsuficientes("Permisos insuficientes para esta operación")
        return token_payload
