from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.soporte_transversal.config import settings

# 1. Crear el motor de la base de datos (Engine)
engine = create_engine(settings.database_url, echo=True)

# 2. Crear la fábrica de sesiones (Session)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Clase Base
class Base(DeclarativeBase):
    pass

# 4. Dependencia de Inyección (Para FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()