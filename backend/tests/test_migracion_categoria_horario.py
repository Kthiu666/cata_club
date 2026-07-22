"""Tests de la migración Alembic que agrega `categoria` a
`horario_entrenamiento`: nullable -> backfill por `hora_inicio` -> NOT NULL.

La función pura de backfill se importa directamente del módulo de la
migración (mismo patrón que `test_seed_dev_bulk.py` usa para scripts) para
poder probarla sin necesitar un motor Alembic real."""
import importlib.util
from datetime import time
from pathlib import Path

import pytest

MIGRACION_PATH = (
    Path(__file__).parents[1] / "alembic" / "versions"
    / "b7f3c1a9d2e4_add_categoria_horario_entrenamiento.py"
)


def _cargar_modulo_migracion():
    spec = importlib.util.spec_from_file_location("migracion_categoria", MIGRACION_PATH)
    modulo = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(modulo)
    return modulo


def test_migracion_declara_el_head_correcto_como_down_revision():
    modulo = _cargar_modulo_migracion()

    assert modulo.down_revision == "0756dd06d542"


@pytest.mark.parametrize("hora_inicio,categoria_esperada", [
    (time(15, 0), "FORMATIVO"),
    (time(16, 0), "INFANTIL"),
    (time(17, 0), "JUVENIL"),
    (time(18, 0), "COMPETITIVO"),
    (time(20, 0), "ADULTOS"),
])
def test_categoria_para_hora_inicio_mapea_las_5_franjas_conocidas(hora_inicio, categoria_esperada):
    modulo = _cargar_modulo_migracion()

    assert modulo.categoria_para_hora_inicio(hora_inicio) == categoria_esperada


def test_categoria_para_hora_inicio_rechaza_hora_desconocida():
    """Sin fallback silencioso: una hora_inicio que no coincide con ninguna
    de las 5 franjas conocidas debe fallar ruidosamente, no adivinar."""
    modulo = _cargar_modulo_migracion()

    with pytest.raises(ValueError):
        modulo.categoria_para_hora_inicio(time(9, 30))
