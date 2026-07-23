"""Tests de la regla de negocio: `categoria` en `HorarioEntrenamiento` bloquea
`hora_inicio`/`hora_fin` a los valores canónicos de `CATEGORIA_METADATA` y
restringe `dia_semana` al conjunto de días permitido por la categoría."""
import pytest

from app.dominio.enums import Categoria, DiaSemana
from app.dominio.excepciones import OperacionInvalida
from app.presentacion.schemas.asistencia_schemas import HorarioCreateDTO, HorarioUpdateDTO
from app.servicios_negocio.asistencia_servicio import AsistenciaServicio
from datetime import time
from tests.conftest import crear_entrenador as _crear_entrenador


def test_crear_horario_deriva_hora_inicio_y_fin_de_la_categoria(db_session):
    entrenador_id = _crear_entrenador(db_session)
    servicio = AsistenciaServicio(db_session)

    horario = servicio.crear_horario(HorarioCreateDTO(
        categoria=Categoria.INFANTIL, dia_semana=DiaSemana.LUNES, entrenador_id=entrenador_id,
    ))

    assert horario.hora_inicio == time(16, 0)
    assert horario.hora_fin == time(17, 0)


def test_crear_horario_deriva_horas_distintas_para_otra_categoria(db_session):
    """Triangulación: distinta categoría -> distinta franja horaria derivada."""
    entrenador_id = _crear_entrenador(db_session)
    servicio = AsistenciaServicio(db_session)

    horario = servicio.crear_horario(HorarioCreateDTO(
        categoria=Categoria.ADULTOS, dia_semana=DiaSemana.MARTES, entrenador_id=entrenador_id,
    ))

    assert horario.hora_inicio == time(20, 0)
    assert horario.hora_fin == time(21, 15)


def test_crear_horario_rechaza_dia_fuera_del_conjunto_de_la_categoria(db_session):
    """FORMATIVO solo permite Lun-Vie: Sábado debe ser rechazado."""
    entrenador_id = _crear_entrenador(db_session)
    servicio = AsistenciaServicio(db_session)

    with pytest.raises(OperacionInvalida):
        servicio.crear_horario(HorarioCreateDTO(
            categoria=Categoria.FORMATIVO, dia_semana=DiaSemana.SABADO, entrenador_id=entrenador_id,
        ))


def test_crear_horario_competitivo_permite_sabado(db_session):
    """Triangulación: COMPETITIVO sí permite Sábado (a diferencia de las otras 4)."""
    entrenador_id = _crear_entrenador(db_session)
    servicio = AsistenciaServicio(db_session)

    horario = servicio.crear_horario(HorarioCreateDTO(
        categoria=Categoria.COMPETITIVO, dia_semana=DiaSemana.SABADO, entrenador_id=entrenador_id,
    ))

    assert horario.dia_semana == DiaSemana.SABADO
    assert horario.hora_inicio == time(18, 0)
    assert horario.hora_fin == time(20, 0)


def test_actualizar_horario_re_deriva_horas_al_cambiar_categoria(db_session):
    entrenador_id = _crear_entrenador(db_session)
    servicio = AsistenciaServicio(db_session)
    horario = servicio.crear_horario(HorarioCreateDTO(
        categoria=Categoria.INFANTIL, dia_semana=DiaSemana.LUNES, entrenador_id=entrenador_id,
    ))

    actualizado = servicio.actualizar_horario(
        horario.id, HorarioUpdateDTO(categoria=Categoria.JUVENIL, dia_semana=DiaSemana.LUNES)
    )

    assert actualizado.hora_inicio == time(17, 0)
    assert actualizado.hora_fin == time(18, 0)


def test_actualizar_horario_rechaza_dia_incompatible_con_nueva_categoria(db_session):
    entrenador_id = _crear_entrenador(db_session)
    servicio = AsistenciaServicio(db_session)
    horario = servicio.crear_horario(HorarioCreateDTO(
        categoria=Categoria.COMPETITIVO, dia_semana=DiaSemana.SABADO, entrenador_id=entrenador_id,
    ))

    with pytest.raises(OperacionInvalida):
        servicio.actualizar_horario(horario.id, HorarioUpdateDTO(categoria=Categoria.JUVENIL))


def test_get_horarios_filtra_por_query_param_categoria(client):
    """Integración: `GET /asistencias/horarios?categoria=X` solo retorna los
    horarios de esa categoría."""
    entrenador = client.post(
        "/api/v1/personas/",
        json={
            "nombres": "Carlos", "apellidos": "Ruiz", "cedula": "1710034099",
            "fecha_nacimiento": "1990-01-01", "telefono": "0991112222",
        },
    ).json()
    client.post("/api/v1/auth/registro", json={
        "cedula": entrenador["cedula"], "correo": "trainer99@x.com", "contrasenia": "password123",
    })
    client.post(f"/api/v1/personas/{entrenador['id']}/roles", json={"tipo_rol": "ENTRENADOR"})

    client.post("/api/v1/asistencias/horarios", json={
        "categoria": "JUVENIL", "dia_semana": "LUNES", "entrenador_id": entrenador["id"],
    })
    client.post("/api/v1/asistencias/horarios", json={
        "categoria": "ADULTOS", "dia_semana": "MARTES", "entrenador_id": entrenador["id"],
    })

    resp = client.get("/api/v1/asistencias/horarios", params={"categoria": "ADULTOS"})

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 1
    assert body[0]["categoria"] == "ADULTOS"


def test_actualizar_horario_sin_tocar_categoria_no_re_deriva_horas(db_session):
    """Actualizar solo entrenador_id no debe recalcular hora_inicio/hora_fin."""
    entrenador_id = _crear_entrenador(db_session, "1710034065")
    otro_entrenador_id = _crear_entrenador(db_session, "1710034073")
    servicio = AsistenciaServicio(db_session)
    horario = servicio.crear_horario(HorarioCreateDTO(
        categoria=Categoria.ADULTOS, dia_semana=DiaSemana.LUNES, entrenador_id=entrenador_id,
    ))

    actualizado = servicio.actualizar_horario(
        horario.id, HorarioUpdateDTO(entrenador_id=otro_entrenador_id)
    )

    assert actualizado.entrenador_id == otro_entrenador_id
    assert actualizado.hora_inicio == time(20, 0)
    assert actualizado.hora_fin == time(21, 15)
