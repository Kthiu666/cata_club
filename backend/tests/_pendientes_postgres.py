"""
Allow-list transitorio (decisión de diseño 1.5, sdd/production-readiness):
archivos de test que todavía fallan corriendo contra Postgres real y no se
repararon en el mismo PR que introdujo el harness (`docker-compose.yml`
`db-test` + `TEST_DATABASE_URL` en `conftest.py`), para no bloquear su
merge con una reparación grande y sin relación entre sí.

Se DESELECCIONAN (no `xfail`) al correr con `TEST_DATABASE_URL` definido —
ver el hook `pytest_collection_modifyitems` en `conftest.py`.
`xfail(strict=False)` se descartó deliberadamente: esconde tanto fallas
reales como passes inesperados, mientras que un deselect + un job de CI
temporal corriendo exactamente estos archivos sobre SQLite mantiene sus
aserciones ejecutándose en algún lado durante la transición.

Cada entrada se elimina en su propio PR (uno por archivo — ver PR-06a..06e
en `sdd/production-readiness/tasks`). Este archivo entero, el hook, y el
job de CI temporal se eliminan en el commit de sunset (PR-06f) una vez la
lista quede vacía.
"""

ARCHIVOS_PENDIENTES: set[str] = {
    # test_ranking.py: `test_marcar_notificacion_ajena_como_leida_falla`
    # crea una `Notificacion(persona_id=999, ...)` para simular "la
    # notificación de otra persona", confiando en que SQLite no aplica FKs
    # por defecto. Contra Postgres real, persona_id=999 no existe y el
    # INSERT viola la FK -- exactamente el tipo de comportamiento que
    # REQ-TEST-1 busca ejercitar. Se repara en PR-06a creando una Persona
    # real distinta a la que llama al endpoint, en vez de un id inventado.
    "test_ranking.py",
}
