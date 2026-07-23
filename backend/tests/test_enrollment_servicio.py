from datetime import date

from app.dominio.enums import TipoRol
from app.dominio.modelos import Usuario
from app.presentacion.schemas.enrollment_schemas import (
    EnrollmentAlumnoDTO,
    EnrollmentCreateDTO,
    EnrollmentCredencialesDTO,
    EnrollmentRepresentanteDTO,
)
from app.servicios_negocio.enrollment_servicio import EnrollmentServicio


# Regression tests for a bug where `_asignar_rol` only called `db.flush()`
# instead of `db.commit()`: the role association was visible within the same
# request's session but silently discarded once that session closed without
# an explicit commit (as `obtener_sesion`'s `finally: db.close()` does in
# production). A single shared `db_session`/connection per test (see
# conftest.py) can't reproduce this — flushed-but-uncommitted writes are
# still visible to later queries on the same connection. Simulating the
# request boundary requires an explicit `rollback()` after the service call:
# only a real `commit()` survives that.

def _alumno_dto(cedula: str = "1723456789", fecha_nacimiento: date = date(2015, 6, 15)) -> EnrollmentAlumnoDTO:
    return EnrollmentAlumnoDTO(
        nombres="Lucas", apellidos="Martinez", cedula=cedula,
        fecha_nacimiento=fecha_nacimiento, telefono="0991234567",
    )


def test_inscripcion_representante_persiste_roles_mas_alla_del_flush(db_session):
    datos = EnrollmentCreateDTO(
        representante=EnrollmentRepresentanteDTO(
            nombres="Sofia", apellidos="Martinez", cedula="1712345678",
            fecha_nacimiento=date(1990, 5, 20), telefono="0991234567",
            correo="sofia@example.com", contrasenia="password8",
        ),
        alumno=_alumno_dto(),
    )
    EnrollmentServicio(db_session).enroll(datos)

    # Simulates the request-scoped session closing without an explicit
    # commit (`obtener_sesion`'s `finally: db.close()`) — only genuinely
    # committed rows survive this.
    db_session.rollback()

    usuario = db_session.query(Usuario).filter(Usuario.correo == "sofia@example.com").one()
    roles = {r.tipo_rol for r in usuario.roles}
    assert roles == {TipoRol.REPRESENTANTE, TipoRol.ALUMNO}


def test_autoinscripcion_jugador_persiste_rol_mas_alla_del_flush(db_session):
    datos = EnrollmentCreateDTO(
        alumno=_alumno_dto(cedula="1798765432", fecha_nacimiento=date(2000, 1, 1)),
        credenciales_alumno=EnrollmentCredencialesDTO(
            correo="jugador@example.com", contrasenia="password8",
        ),
    )
    EnrollmentServicio(db_session).enroll(datos)

    db_session.rollback()

    usuario = db_session.query(Usuario).filter(Usuario.correo == "jugador@example.com").one()
    roles = {r.tipo_rol for r in usuario.roles}
    assert roles == {TipoRol.ALUMNO}
