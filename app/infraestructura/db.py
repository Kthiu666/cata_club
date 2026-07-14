from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.soporte_transversal.configuracion import settings
from app.dominio.modelos import Base

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def obtener_sesion() -> Session:
    """Dependencia de FastAPI: entrega una sesión de BD por request y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def crear_tablas():
    """Solo para desarrollo. En producción se usa Alembic para migraciones."""
    Base.metadata.create_all(bind=engine)
