"""Dev-only bootstrap: creates one ADMINISTRADOR account for local testing.

Real registration (POST /auth/registro) requires a Persona to already exist
(created by an admin via POST /personas) and never assigns a role — there is
no way to create the very first admin through the API alone. This script
inserts directly via the ORM, idempotently (safe to run on every container
start).

Login with:
  email:    admin@cataclub.local
  password: admin12345
"""
import os
import sys
from datetime import date

# Running as `python scripts/seed_dev_admin.py` puts this file's own
# directory on sys.path[0], not the project root — add the root so `app.*`
# is importable, matching tests/conftest.py's own pattern.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infraestructura.db import SessionLocal
from app.dominio.modelos import Persona, Usuario, Rol
from app.dominio.enums import TipoRol
from app.seguridad.gestor_auth import GestorAutenticacion

CEDULA = "0000000001"
CORREO = "admin@cataclub.local"
CONTRASENIA = "admin12345"


def main() -> None:
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).filter(Usuario.correo == CORREO).first()
        if usuario:
            print(f"[seed] {CORREO} ya existe (usuario id={usuario.id}) — nada que hacer.")
            return

        persona = db.query(Persona).filter(Persona.cedula == CEDULA).first()
        if not persona:
            persona = Persona(
                nombres="Admin",
                apellidos="Dev",
                cedula=CEDULA,
                fecha_nacimiento=date(1990, 1, 1),
                telefono="0999999999",
            )
            db.add(persona)
            db.flush()

        rol_admin = db.query(Rol).filter(Rol.tipo_rol == TipoRol.ADMINISTRADOR).first()
        if not rol_admin:
            rol_admin = Rol(tipo_rol=TipoRol.ADMINISTRADOR, descripcion="Administrador")
            db.add(rol_admin)
            db.flush()

        usuario = Usuario(
            correo=CORREO,
            contrasenia=GestorAutenticacion.obtener_hash_contrasenia(CONTRASENIA),
            persona_id=persona.id,
            roles=[rol_admin],
        )
        db.add(usuario)
        db.commit()
        print(f"[seed] Creado admin de desarrollo: {CORREO} / {CONTRASENIA}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
