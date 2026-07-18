from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.soporte_transversal.configuracion import settings
from app.soporte_transversal.rate_limit import limiter
from app.presentacion.routers import (
    auth_router,
    personas_router,
    membresias_pagos_router,
    asistencias_router,
    ficha_medica_router,
    clases_extra_router,
    geografia_router,
    ranking_router,
    tesoreria_router,
    enrollment_router,
)
from app.dominio.excepciones import (
    EntidadNoEncontrada, EntidadDuplicada, OperacionInvalida,
    CredencialesInvalidas, PermisosInsuficientes,
)

app = FastAPI(title=settings.app_nombre, version=settings.app_version)

# --- Rate limiting -----------------------------------------------------------
# Se deshabilita en ambiente de test (limiter es NoOpLimiter, ver rate_limit.py).
if settings.ambiente != "test":
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --- Respuesta de error consistente para frontend + backend -----------------
# El frontend (Next.js) espera `message`; el backend original usa `detail`.
# Devolvemos ambos para compatibilidad sin romper contratos existentes.
def _respuesta_error(codigo: int, mensaje: str) -> JSONResponse:
    return JSONResponse(status_code=codigo, content={"detail": mensaje, "message": mensaje})


# --- Manejadores globales: traducen excepciones de dominio a códigos HTTP ---
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
            return _respuesta_error(codigo, exc.mensaje)
        return _handler
    app.add_exception_handler(_excepcion, _crear_handler(_codigo))


# --- HTTPException de FastAPI también devuelve {detail, message} ------------
@app.exception_handler(HTTPException)
async def _http_exception_handler(request: Request, exc: HTTPException):
    return _respuesta_error(exc.status_code, str(exc.detail))

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
app.include_router(tesoreria_router.router, prefix="/api/v1")
app.include_router(enrollment_router.router, prefix="/api/v1")


@app.get("/", tags=["Salud"])
async def raiz():
    return {"mensaje": "API Cata Club operativa", "version": settings.app_version}
