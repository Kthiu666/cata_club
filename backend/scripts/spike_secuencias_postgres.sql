-- Spike PR-04 (production-readiness / test-database-foundation): verifica
-- empíricamente si `ALTER SEQUENCE ... RESTART WITH n` se comporta de forma
-- transaccional en PostgreSQL 16 — es decir, si su efecto se deshace con un
-- ROLLBACK, a diferencia de `nextval()`/`setval()` (que NUNCA se deshacen,
-- por diseño de Postgres, para garantizar unicidad entre transacciones
-- concurrentes incluso si una de ellas aborta).
--
-- Esto es el supuesto de mayor riesgo detrás de la decisión de diseño 1.4
-- (aislamiento por test vía `Session(..., join_transaction_mode=
-- "create_savepoint")` + reseteo de secuencias a 1 dentro de la transacción
-- externa de cada test). Los tests existentes hardcodean ids bajos, p.ej.
-- `"persona_id": 1` en `conftest.py:128,147,168`. Si el reseteo NO
-- persistiera hasta el próximo test de forma predecible, o si el rollback NO
-- deshiciera el reseteo (dejando la secuencia "pegada" en un valor alto tras
-- cada test), ese hardcode se rompería de forma masiva.
--
-- MÉTODO: contenedor Postgres 16-alpine descartable (no la BD de desarrollo
-- del proyecto), ejecutado manualmente vía `docker run --rm postgres:16-alpine`
-- + `psql`. Este archivo documenta las dos corridas hechas y su resultado
-- real observado; no se ejecuta como parte de la suite (no hay runner que lo
-- invoque).
--
-- HALLAZGO (confirmado, 2 corridas independientes, Postgres 16.x):
--   `ALTER SEQUENCE ... RESTART WITH n` SÍ es transaccional: su efecto sobre
--   `last_value`/`is_called` se revierte con ROLLBACK de la transacción que
--   lo contiene, incluso cuando entre el RESTART y el ROLLBACK hubo llamadas
--   a `nextval()` (vía INSERT) atravesando ciclos SAVEPOINT/RELEASE SAVEPOINT
--   — exactamente el patrón que produce
--   `Session(bind=conexion, join_transaction_mode="create_savepoint")` cada
--   vez que un repositorio llama `session.commit()` internamente
--   (`asistencia_repositorio.py:26-30,46-50,112-116` y equivalentes).
--
--   Corrida 1 (ROLLBACK simple): secuencia en last_value=3/is_called=t antes
--   de la transacción -> RESTART WITH 1 -> INSERT (nextval devuelve 1,
--   last_value=1/is_called=t) -> ROLLBACK -> last_value vuelve a 3/is_called
--   vuelve a t. La fila insertada también desaparece (0 filas).
--
--   Corrida 2 (con SAVEPOINT/RELEASE, imitando `create_savepoint`): mismo
--   punto de partida -> RESTART WITH 1 -> SAVEPOINT + INSERT id=1 + RELEASE
--   -> SAVEPOINT + INSERT id=2 + RELEASE -> (last_value=2/is_called=t en ese
--   punto) -> ROLLBACK de la transacción externa -> last_value vuelve a
--   3/is_called vuelve a t, 0 filas.
--
-- CONCLUSIÓN PARA PR-05: la decisión 1.4 queda validada empíricamente contra
-- Postgres 16 real. `_reiniciar_secuencias(conexion)` puede emitir
-- `ALTER SEQUENCE <s> RESTART WITH 1` para cada secuencia dentro de la
-- transacción externa de `db_session`, confiando en que el rollback final la
-- deja exactamente como estaba antes del test — sin necesidad de reescribir
-- los tests que hardcodean ids bajos.

-- ============================================================
-- Corrida 1: ROLLBACK simple
-- ============================================================
DROP TABLE IF EXISTS spike_persona;
CREATE TABLE spike_persona (id serial PRIMARY KEY, nombre text);

INSERT INTO spike_persona (nombre) VALUES ('a'), ('b'), ('c');
DELETE FROM spike_persona;  -- deja last_value=3, is_called=t, 0 filas (COMMIT implícito de autocommit)
SELECT 'baseline_before_txn' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;

BEGIN;
ALTER SEQUENCE spike_persona_id_seq RESTART WITH 1;
SELECT 'inside_txn_after_restart' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;
INSERT INTO spike_persona (nombre) VALUES ('rolled_back_row') RETURNING id;
SELECT 'inside_txn_after_insert' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;
ROLLBACK;

SELECT 'after_rollback' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;  -- observado: 3, t
SELECT 'row_count_after_rollback' AS etiqueta, count(*) FROM spike_persona;            -- observado: 0

-- ============================================================
-- Corrida 2: ciclo SAVEPOINT/RELEASE SAVEPOINT (patrón create_savepoint)
-- ============================================================
DELETE FROM spike_persona;
SELECT 'baseline_before_txn' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;

BEGIN;
ALTER SEQUENCE spike_persona_id_seq RESTART WITH 1;
SAVEPOINT sp_commit_1;
INSERT INTO spike_persona (nombre) VALUES ('repo_commit_1') RETURNING id;
RELEASE SAVEPOINT sp_commit_1;
SAVEPOINT sp_commit_2;
INSERT INTO spike_persona (nombre) VALUES ('repo_commit_2') RETURNING id;
RELEASE SAVEPOINT sp_commit_2;
SELECT 'inside_txn_after_two_releases' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;
ROLLBACK;

SELECT 'after_rollback' AS etiqueta, last_value, is_called FROM spike_persona_id_seq;  -- observado: 3, t
SELECT 'row_count_after_rollback' AS etiqueta, count(*) FROM spike_persona;            -- observado: 0
