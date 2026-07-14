from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos todos los routers que creaste
from app.presentacion.routers import (
    personas_router, 
    membresias_router, 
    pagos_router, 
    asistencias_router
)

app = FastAPI(
    title="CATA CLUB API",
    description="Backend implementando Arquitectura Limpia (APE 13)",
    version="1.1.0"
)

# Configuración CORS para el Frontend (Pareja 3)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registramos las rutas en la aplicación
app.include_router(personas_router.router, prefix="/api/v1")
app.include_router(membresias_router.router, prefix="/api/v1")
app.include_router(pagos_router.router, prefix="/api/v1")
app.include_router(asistencias_router.router, prefix="/api/v1")

@app.get("/")
def read_root():
3    return {"mensaje": "API Operativa. Visita /docs para ver los endpoints"}