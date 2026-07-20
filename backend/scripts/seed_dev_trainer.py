"""Dev-only bootstrap: creates one ENTRENADOR account with supporting data.

Creates a trainer user, 5 weekly schedules (Mon-Fri), 11 ranking levels,
2 membership types, and 3 sample students with active memberships and
ranking assignments -- all idempotent (safe to run on every container start).

Login with:
  email:    entrenador@cataclub.local
  password: trainer12345
"""
import os
import sys
from datetime import date, datetime, time, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infraestructura.db import SessionLocal
from app.dominio.modelos import (
    Persona,
    Usuario,
    Rol,
    HorarioEntrenamiento,
    NivelRanking,
    TipoMembresia,
    Membresia,
    Ranking,
)
from app.dominio.enums import (
    TipoRol,
    DiaSemana,
    EstadoMembresia,
    TipoModalidad,
)
from app.seguridad.gestor_auth import GestorAutenticacion

# ---------------------------------------------------------------------------
# Entrenador
# ---------------------------------------------------------------------------
TRAINER_CEDULA = "0000000002"
TRAINER_CORREO = "entrenador@cataclub.local"
TRAINER_CONTRASENIA = "trainer12345"

# ---------------------------------------------------------------------------
# Horarios  (categoria x Lunes-Viernes = 25 registros)
# ---------------------------------------------------------------------------
HORARIOS = [
    ("Formativo",   time(15, 0), time(16, 0)),
    ("Infantil",    time(16, 0), time(17, 0)),
    ("Juvenil",     time(17, 0), time(18, 0)),
    ("Competitivo", time(18, 0), time(20, 0)),
    ("Adultos",     time(20, 0), time(21, 0)),
]
DIAS = [
    DiaSemana.LUNES,
    DiaSemana.MARTES,
    DiaSemana.MIERCOLES,
    DiaSemana.JUEVES,
    DiaSemana.VIERNES,
]

# ---------------------------------------------------------------------------
# NivelRanking  (1 = mejor ... 11 = mas bajo)
# ---------------------------------------------------------------------------
NIVELES = [
    (1, "1A"),
    (2, "1B"),
    (3, "2"),
    (4, "3"),
    (5, "4"),
    (6, "5"),
    (7, "6"),
    (8, "7"),
    (9, "8"),
    (10, "9"),
    (11, "10"),
]

# ---------------------------------------------------------------------------
# TipoMembresia
# ---------------------------------------------------------------------------
MEMBRESIAS_TIPO = [
    {
        "categoria": "Mensual Infantil",
        "franja_horaria": "15:00-18:00",
        "precio": 25.00,
        "modalidad": TipoModalidad.MENSUAL,
    },
    {
        "categoria": "Mensual Adultos",
        "franja_horaria": "20:00-21:00",
        "precio": 40.00,
        "modalidad": TipoModalidad.MENSUAL,
    },
]

# ---------------------------------------------------------------------------
# Alumnos de ejemplo
# ---------------------------------------------------------------------------
ALUMNOS = [
    {
        "nombres": "Ana",
        "apellidos": "Garcia",
        "cedula": "0000000003",
        "correo": "ana@cataclub.local",
        "contrasenia": "alumno123",
        "telefono": "0971111111",
        "nivel_ranking_id": 2,
        "membresia_categoria": "Mensual Infantil",
    },
    {
        "nombres": "Luis",
        "apellidos": "Lopez",
        "cedula": "0000000004",
        "correo": "luis@cataclub.local",
        "contrasenia": "alumno123",
        "telefono": "0972222222",
        "nivel_ranking_id": 1,
        "membresia_categoria": "Mensual Infantil",
    },
    {
        "nombres": "Maria",
        "apellidos": "Torres",
        "cedula": "0000000005",
        "correo": "maria@cataclub.local",
        "contrasenia": "alumno123",
        "telefono": "0973333333",
        "nivel_ranking_id": 6,
        "membresia_categoria": "Mensual Adultos",
    },
]


def _obtener_o_crear(db, modelo, filtro, defaults):
    """Return existing row or create a new one."""
    obj = db.query(modelo).filter(filtro).first()
    if obj:
        return obj, False
    obj = modelo(**defaults)
    db.add(obj)
    db.flush()
    return obj, True


def main() -> None:
    db = SessionLocal()
    try:
        # ------------------------------------------------------------------
        # 1. Entrenador
        # ------------------------------------------------------------------
        existing = db.query(Usuario).filter(Usuario.correo == TRAINER_CORREO).first()
        if existing:
            print(f"[seed] {TRAINER_CORREO} ya existe (usuario id={existing.id}) -- saltando seed.")
            return

        persona, _ = _obtener_o_crear(
            db,
            Persona,
            Persona.cedula == TRAINER_CEDULA,
            {
                "nombres": "Carlos",
                "apellidos": "Mendoza",
                "cedula": TRAINER_CEDULA,
                "fecha_nacimiento": date(1985, 6, 15),
                "telefono": "0988888888",
            },
        )

        rol_entrenador, _ = _obtener_o_crear(
            db,
            Rol,
            Rol.tipo_rol == TipoRol.ENTRENADOR,
            {"tipo_rol": TipoRol.ENTRENADOR, "descripcion": "Entrenador"},
        )

        usuario = Usuario(
            correo=TRAINER_CORREO,
            contrasenia=GestorAutenticacion.obtener_hash_contrasenia(TRAINER_CONTRASENIA),
            persona_id=persona.id,
            roles=[rol_entrenador],
        )
        db.add(usuario)
        db.flush()
        print(f"[seed] Entrenador creado: {TRAINER_CORREO} / {TRAINER_CONTRASENIA}")

        # ------------------------------------------------------------------
        # 2. Horarios (5 categorias x 5 dias = 25)
        # ------------------------------------------------------------------
        horario_count = 0
        for _, h_inicio, h_fin in HORARIOS:
            for dia in DIAS:
                _, created = _obtener_o_crear(
                    db,
                    HorarioEntrenamiento,
                    (
                        (HorarioEntrenamiento.entrenador_id == persona.id)
                        & (HorarioEntrenamiento.dia_semana == dia)
                        & (HorarioEntrenamiento.hora_inicio == h_inicio)
                    ),
                    {
                        "dia_semana": dia,
                        "hora_inicio": h_inicio,
                        "hora_fin": h_fin,
                        "entrenador_id": persona.id,
                    },
                )
                if created:
                    horario_count += 1
        print(f"[seed] Horarios creados: {horario_count} (de 25 posibles)")

        # ------------------------------------------------------------------
        # 3. NivelRanking (1 = mejor ... 11 = mas bajo)
        # ------------------------------------------------------------------
        nivel_count = 0
        for numero, nombre in NIVELES:
            _, created = _obtener_o_crear(
                db,
                NivelRanking,
                NivelRanking.numero_nivel == numero,
                {"numero_nivel": numero, "nombre": nombre},
            )
            if created:
                nivel_count += 1
        print(f"[seed] Niveles de ranking creados: {nivel_count} (de 11 posibles)")

        # ------------------------------------------------------------------
        # 4. TipoMembresia
        # ------------------------------------------------------------------
        tipos_membresia = {}
        for tm_data in MEMBRESIAS_TIPO:
            tm, created = _obtener_o_crear(
                db,
                TipoMembresia,
                TipoMembresia.categoria == tm_data["categoria"],
                tm_data,
            )
            tipos_membresia[tm_data["categoria"]] = tm
            if created:
                print(f"[seed] TipoMembresia creado: {tm_data['categoria']}")

        # ------------------------------------------------------------------
        # 5. Alumnos + Membresia + Ranking
        # ------------------------------------------------------------------
        rol_alumno, _ = _obtener_o_crear(
            db,
            Rol,
            Rol.tipo_rol == TipoRol.ALUMNO,
            {"tipo_rol": TipoRol.ALUMNO, "descripcion": "Alumno"},
        )

        now = datetime.now(timezone.utc)

        for alu in ALUMNOS:
            existing_user = db.query(Usuario).filter(Usuario.correo == alu["correo"]).first()
            if existing_user:
                print(f"[seed] Alumno {alu['correo']} ya existe -- saltando.")
                continue

            alu_persona, _ = _obtener_o_crear(
                db,
                Persona,
                Persona.cedula == alu["cedula"],
                {
                    "nombres": alu["nombres"],
                    "apellidos": alu["apellidos"],
                    "cedula": alu["cedula"],
                    "fecha_nacimiento": date(2010, 3, 10),
                    "telefono": alu["telefono"],
                },
            )

            alu_usuario = Usuario(
                correo=alu["correo"],
                contrasenia=GestorAutenticacion.obtener_hash_contrasenia(alu["contrasenia"]),
                persona_id=alu_persona.id,
                roles=[rol_alumno],
            )
            db.add(alu_usuario)

            tm = tipos_membresia.get(alu["membresia_categoria"])
            if tm:
                membresia = Membresia(
                    estado=EstadoMembresia.ACTIVA,
                    monto_aplicado=tm.precio,
                    fecha_activacion=now,
                    persona_id=alu_persona.id,
                    tipo_membresia_id=tm.id,
                )
                db.add(membresia)

            ranking = Ranking(
                persona_id=alu_persona.id,
                nivel_ranking_id=alu["nivel_ranking_id"],
                esta_en_ranking=True,
            )
            db.add(ranking)

            print(f"[seed] Alumno creado: {alu['nombres']} {alu['apellidos']} ({alu['correo']})")

        db.commit()
        print("[seed] Seed de entrenador completado exitosamente.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
