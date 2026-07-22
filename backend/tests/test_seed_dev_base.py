"""Tests del seed script `seed_dev_base.py`: verificaciones estructurales de
`HORARIOS` (leídas vía import, sin ejecutar `main()`, mismo patrón que
`test_seed_dev_bulk.py`) más un smoke run de extremo a extremo de `main()`
contra un motor SQLite en memoria, para probar que la fila realmente
persiste `categoria` (y no solo que la estructura en memoria la contiene)."""
import importlib.util
from datetime import time
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.dominio.enums import Categoria, DiaSemana
from app.dominio.modelos import Base, HorarioEntrenamiento

SEED_SCRIPT = Path(__file__).parents[1] / "scripts" / "seed_dev_base.py"


def _cargar_modulo_seed():
    spec = importlib.util.spec_from_file_location("seed_dev_base", SEED_SCRIPT)
    modulo = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(modulo)
    return modulo


def test_horarios_incluye_las_5_categorias_con_categoria_asignada():
    modulo = _cargar_modulo_seed()

    categorias = {categoria for categoria, _, _ in modulo.HORARIOS}

    assert categorias == {
        Categoria.FORMATIVO, Categoria.INFANTIL, Categoria.JUVENIL,
        Categoria.COMPETITIVO, Categoria.ADULTOS,
    }


def test_adultos_termina_a_las_21_15():
    modulo = _cargar_modulo_seed()

    adultos = next(h for h in modulo.HORARIOS if h[0] == Categoria.ADULTOS)

    assert adultos[2] == time(21, 15)


def test_competitivo_corre_lunes_a_sabado_las_otras_solo_lunes_a_viernes():
    modulo = _cargar_modulo_seed()

    assert DiaSemana.SABADO in modulo.dias_para(Categoria.COMPETITIVO)
    assert DiaSemana.SABADO not in modulo.dias_para(Categoria.FORMATIVO)
    assert DiaSemana.SABADO not in modulo.dias_para(Categoria.INFANTIL)
    assert DiaSemana.SABADO not in modulo.dias_para(Categoria.JUVENIL)
    assert DiaSemana.SABADO not in modulo.dias_para(Categoria.ADULTOS)


def test_total_de_filas_de_horario_generadas_es_26():
    """4 categorías x 5 días (Lun-Vie) + Competitivo x 6 días (Lun-Sáb) = 26."""
    modulo = _cargar_modulo_seed()

    total = sum(len(modulo.dias_para(categoria)) for categoria, _, _ in modulo.HORARIOS)

    assert total == 26


def test_main_persiste_26_horarios_con_categoria_adultos_21_15_y_competitivo_sabado():
    """Smoke run de extremo a extremo: ejecuta `main()` de verdad contra un
    motor SQLite en memoria y verifica los datos REALMENTE persistidos (no
    solo la estructura HORARIOS en memoria) -- cierra el hueco que el propio
    diseño señaló como 'no verificado end-to-end' en el intento anterior."""
    modulo = _cargar_modulo_seed()

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    modulo.SessionLocal = TestingSessionLocal

    modulo.main()

    with TestingSessionLocal() as verificacion:
        horarios = list(verificacion.execute(select(HorarioEntrenamiento)).scalars().all())

        assert len(horarios) == 26
        assert all(h.categoria is not None for h in horarios)

        adultos = [h for h in horarios if h.categoria == Categoria.ADULTOS]
        assert len(adultos) == 5
        assert all(h.hora_fin == time(21, 15) for h in adultos)

        competitivo_dias = {h.dia_semana for h in horarios if h.categoria == Categoria.COMPETITIVO}
        assert competitivo_dias == set(modulo.dias_para(Categoria.COMPETITIVO))
        assert DiaSemana.SABADO in competitivo_dias
