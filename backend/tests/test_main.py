"""
Tests a nivel de aplicación (`main.py`): endpoint de salud
(sdd/production-readiness, PR-09).
"""
from fastapi.testclient import TestClient

from main import app


# --- GET /health (PR-09) ----------------------------------------------------
# Debe existir ANTES de endurecer /docs (PR-10): el healthcheck de
# docker-compose.yml hoy apunta a /docs, y quitarle CSP/docs_url sin antes
# tener un reemplazo rompería el propio healthcheck del deploy.
def test_health_no_declara_ninguna_dependencia():
    """Guardia estructural: /health no debe depender de `obtener_sesion` ni
    de autenticación -- tiene que responder incluso si la BD está caída,
    porque es la sonda de liveness del contenedor backend."""
    ruta = next(r for r in app.routes if getattr(r, "path", None) == "/health")
    assert ruta.dependant.dependencies == []


def test_health_responde_200_sin_autenticacion_ni_overrides():
    """TestClient(app) crudo, sin ningún dependency_override de las fixtures
    de conftest.py: si /health dependiera de la BD o de un token, esta
    llamada fallaría distinto de un 200 limpio."""
    with TestClient(app) as cliente:
        respuesta = cliente.get("/health")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}
