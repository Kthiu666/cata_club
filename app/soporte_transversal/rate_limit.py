"""Configuración global de rate limiting.

Se comparte entre main.py (handler global) y los routers (decoradores).
En ambiente de test se usa un NoOpLimiter para no afectar los tests.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.soporte_transversal.configuracion import settings


class _NoOpLimiter:
    """Limiter que no hace nada — usado en ambiente de test."""

    def limit(self, *_args, **_kwargs):
        def decorator(func):
            return func
        return decorator


def _crear_limiter() -> Limiter | _NoOpLimiter:
    if settings.ambiente == "test":
        return _NoOpLimiter()
    return Limiter(key_func=get_remote_address)


limiter = _crear_limiter()
