"""Tests de `CATEGORIA_METADATA`: fuente única de verdad para las 5 categorías
fijas de horario (edad, hora_inicio/hora_fin, días permitidos)."""
from datetime import time

from app.dominio.enums import Categoria, DiaSemana
from app.dominio.categoria_metadata import CATEGORIA_METADATA, dias_permitidos, horario_de

LUN_VIE = frozenset({
    DiaSemana.LUNES, DiaSemana.MARTES, DiaSemana.MIERCOLES,
    DiaSemana.JUEVES, DiaSemana.VIERNES,
})
LUN_SAB = LUN_VIE | {DiaSemana.SABADO}


def test_categoria_metadata_tiene_las_5_categorias_con_horas_correctas():
    assert CATEGORIA_METADATA[Categoria.FORMATIVO].hora_inicio == time(15, 0)
    assert CATEGORIA_METADATA[Categoria.FORMATIVO].hora_fin == time(16, 0)

    assert CATEGORIA_METADATA[Categoria.INFANTIL].hora_inicio == time(16, 0)
    assert CATEGORIA_METADATA[Categoria.INFANTIL].hora_fin == time(17, 0)

    assert CATEGORIA_METADATA[Categoria.JUVENIL].hora_inicio == time(17, 0)
    assert CATEGORIA_METADATA[Categoria.JUVENIL].hora_fin == time(18, 0)

    assert CATEGORIA_METADATA[Categoria.COMPETITIVO].hora_inicio == time(18, 0)
    assert CATEGORIA_METADATA[Categoria.COMPETITIVO].hora_fin == time(20, 0)

    assert CATEGORIA_METADATA[Categoria.ADULTOS].hora_inicio == time(20, 0)
    assert CATEGORIA_METADATA[Categoria.ADULTOS].hora_fin == time(21, 15)


def test_dias_permitidos_competitivo_incluye_sabado():
    assert dias_permitidos(Categoria.COMPETITIVO) == LUN_SAB


def test_dias_permitidos_otras_categorias_no_incluyen_sabado():
    assert dias_permitidos(Categoria.FORMATIVO) == LUN_VIE
    assert dias_permitidos(Categoria.INFANTIL) == LUN_VIE
    assert dias_permitidos(Categoria.JUVENIL) == LUN_VIE
    assert dias_permitidos(Categoria.ADULTOS) == LUN_VIE


def test_horario_de_retorna_hora_inicio_y_fin_de_la_categoria():
    assert horario_de(Categoria.INFANTIL) == (time(16, 0), time(17, 0))
    assert horario_de(Categoria.ADULTOS) == (time(20, 0), time(21, 15))
