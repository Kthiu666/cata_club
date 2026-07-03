# Este archivo demuestra cómo se estructurarán los servicios futuros
class ServicioBase:
    """
    Clase base para todos los servicios de negocio.
    Aquí se inyectará la sesión de la base de datos (Unit of Work / Repositorio)
    para que la lógica de negocio no interactúe directamente con SQLAlchemy.
    """
    def __init__(self, repositorio=None):
        self.repositorio = repositorio3