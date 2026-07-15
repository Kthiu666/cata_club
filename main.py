from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.soporte_transversal.configuracion import settings
from app.presentacion.routers import (
    auth_router,
    personas_router,
    membresias_pagos_router,
    asistencias_router,
    ficha_medica_router,
    clases_extra_router,
    geografia_router,
    ranking_router,
)
from app.dominio.excepciones import (
    EntidadNoEncontrada, EntidadDuplicada, OperacionInvalida,
    CredencialesInvalidas, PermisosInsuficientes,
)

app = FastAPI(title=settings.app_nombre, version=settings.app_version)

# --- Manejadores globales: traducen excepciones de dominio a códigos HTTP ---
# Así los routers y servicios_negocio nunca importan HTTPException; la capa
# de presentación es la única que conoce el protocolo HTTP.
_MAPA_EXCEPCIONES = {
    EntidadNoEncontrada: status.HTTP_404_NOT_FOUND,
    EntidadDuplicada: status.HTTP_400_BAD_REQUEST,
    OperacionInvalida: status.HTTP_400_BAD_REQUEST,
    CredencialesInvalidas: status.HTTP_401_UNAUTHORIZED,
    PermisosInsuficientes: status.HTTP_403_FORBIDDEN,
}

for _excepcion, _codigo in _MAPA_EXCEPCIONES.items():
    def _crear_handler(codigo):
        async def _handler(request: Request, exc):
            return JSONResponse(status_code=codigo, content={"detail": exc.mensaje})
        return _handler
    app.add_exception_handler(_excepcion, _crear_handler(_codigo))

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origenes,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(personas_router.router, prefix="/api/v1")
app.include_router(membresias_pagos_router.router, prefix="/api/v1")
app.include_router(asistencias_router.router, prefix="/api/v1")
app.include_router(ficha_medica_router.router, prefix="/api/v1")
app.include_router(clases_extra_router.router, prefix="/api/v1")
app.include_router(geografia_router.router, prefix="/api/v1")
app.include_router(ranking_router.router, prefix="/api/v1")


@app.get("/", tags=["Salud"])
async def raiz():
    return {"mensaje": "API Cata Club operativa", "version": settings.app_version}
