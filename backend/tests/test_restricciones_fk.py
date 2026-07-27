"""
Prueba de aislamiento del harness Postgres (REQ-TEST-1, escenario "FK
enforcement now exercisable"): confirma que las claves foráneas se aplican
de verdad contra Postgres real, algo imposible de probar en la rama SQLite
transitoria (decisión 1.5) porque SQLite no aplica FKs por defecto.

De ahí el `skipif`: sin `TEST_DATABASE_URL` esta prueba no puede fallar de
forma significativa (insertar una FK colgante simplemente "funcionaría" en
SQLite), así que se salta en vez de dar un falso verde.
"""
import os

import pytest
from sqlalchemy.exc import IntegrityError

from app.dominio.enums import TipoNotificacion
from app.dominio.modelos import Notificacion

pytestmark = pytest.mark.skipif(
    not os.environ.get("TEST_DATABASE_URL"),
    reason=(
        "La aplicación real de FKs solo existe en Postgres; SQLite no las "
        "hace cumplir por defecto en este harness."
    ),
)


def test_notificacion_con_persona_id_colgante_viola_fk(db_session):
    notificacion = Notificacion(
        persona_id=999_999,
        tipo=TipoNotificacion.MIEMBRESIA_VENCIMIENTO_PROXIMO,
        mensaje="persona inexistente",
    )
    db_session.add(notificacion)

    with pytest.raises(IntegrityError):
        db_session.commit()
