from datetime import date
from sqlalchemy.orm import Session

from app.dominio.modelos import Persona, FichaMedica, Enfermedades
from app.dominio.enums import TipoRol
from app.dominio.excepciones import EntidadNoEncontrada, EntidadDuplicada, OperacionInvalida
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.usuario_ficha_repositorio import FichaMedicaRepositorio
from app.presentacion.schemas.persona_schemas import (
    PersonaCreateDTO, PersonaUpdateDTO, RepresentadoCreateDTO,
)


# --- Restricciones de dominio: edad y tutor legal ---------------------------
# Solo se admiten alumnos entre 5 y 74 años. Si el alumno es menor de edad
# (5 a 17 años), el Representante/Tutor legal es OBLIGATORIO; no basta con
# que la columna sea nullable a nivel de BD: la regla se aplica en el
# servicio de dominio, no en el ORM ni en el router.
EDAD_MINIMA_ALUMNO = 5
EDAD_MAXIMA_ALUMNO = 74
EDAD_MAYORIA_EDAD = 18


def _calcular_edad(fecha_nacimiento: date, referencia: date | None = None) -> int:
    ref = referencia or date.today()
    anos = ref.year - fecha_nacimiento.year
    if (ref.month, ref.day) < (fecha_nacimiento.month, fecha_nacimiento.day):
        anos -= 1
    return anos


class PersonaServicio:
    """Contiene las reglas de negocio de Persona. No conoce FastAPI ni HTTPException;
    comunica errores mediante excepciones de dominio."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = PersonaRepositorio(db)

    def registrar_persona(self, datos: PersonaCreateDTO) -> Persona:
        if self.repo.obtener_por_cedula(datos.cedula):
            raise EntidadDuplicada(f"Ya existe una persona con la cédula {datos.cedula}")

        edad = _calcular_edad(datos.fecha_nacimiento)
        if edad < EDAD_MINIMA_ALUMNO or edad > EDAD_MAXIMA_ALUMNO:
            raise OperacionInvalida(
                f"La edad del alumno debe estar entre {EDAD_MINIMA_ALUMNO} y "
                f"{EDAD_MAXIMA_ALUMNO} años (calculado: {edad})."
            )
        if EDAD_MINIMA_ALUMNO <= edad < EDAD_MAYORIA_EDAD and not datos.representante_id:
            raise OperacionInvalida(
                "El alumno es menor de edad (5-17 años): los datos del Representante/"
                "Tutor legal (representante_id) son obligatorios."
            )

        if datos.representante_id:
            representante = self.repo.obtener_por_id(datos.representante_id)
            if not representante:
                raise EntidadNoEncontrada(f"Representante con id {datos.representante_id} no encontrado")
            # El representante legal debe ser mayor de edad: una persona menor
            # no puede ser tutor legal de otra (regla de dominio, no de ORM).
            edad_representante = _calcular_edad(representante.fecha_nacimiento)
            if edad_representante < EDAD_MAYORIA_EDAD:
                raise OperacionInvalida(
                    f"El representante legal debe ser mayor de edad "
                    f"({EDAD_MAYORIA_EDAD} años o más); el representante indicado "
                    f"tiene {edad_representante} años."
                )

        nueva_persona = Persona(**datos.model_dump())
        return self.repo.crear(nueva_persona)

    def crear_representado(self, representante_id: int, datos: RepresentadoCreateDTO) -> Persona:
        """Autoservicio del portal: un representante ya autenticado agrega un
        dependiente (hijo). Crea únicamente la Persona (vía `registrar_persona`,
        reusando las reglas de edad/duplicado/tutor sin cambios) más su
        `FichaMedica` si se proporcionó — NO crea `Usuario` ni asigna roles
        (mirrors `EnrollmentServicio.enroll`, sin la parte de credenciales).

        Nota: igual que `EnrollmentServicio`, cada `repo.crear()` hace su
        propio commit (no hay una única transacción de BD); si la creación de
        la ficha médica falla después del commit de la Persona, queda un
        Persona huérfano sin ficha. Riesgo heredado, no introducido aquí."""
        persona_datos = PersonaCreateDTO(
            nombres=datos.nombres,
            apellidos=datos.apellidos,
            cedula=datos.cedula,
            fecha_nacimiento=datos.fecha_nacimiento,
            telefono=datos.telefono,
            representante_id=representante_id,
        )
        representado = self.registrar_persona(persona_datos)

        if datos.ficha_medica:
            ficha = FichaMedica(
                tipo_sangre=datos.ficha_medica.tipo_sangre,
                persona_id=representado.id,
                alergias=datos.ficha_medica.alergias,
                contacto_emergencia=datos.ficha_medica.contacto_emergencia,
                telefono_emergencia=datos.ficha_medica.telefono_emergencia,
            )
            for nombre in datos.ficha_medica.enfermedades:
                ficha.enfermedades.append(Enfermedades(nombre_enfermedad=nombre))
            FichaMedicaRepositorio(self.db).crear(ficha)

        return representado

    def listar_personas(self, skip: int = 0, limit: int = 50) -> tuple[list[Persona], int]:
        items = self.repo.listar(skip, limit)
        total = self.repo.contar()
        return items, total

    def obtener_persona(self, persona_id: int) -> Persona:
        persona = self.repo.obtener_por_id(persona_id)
        if not persona:
            raise EntidadNoEncontrada(f"Persona con id {persona_id} no encontrada")
        return persona

    def listar_representados(self, persona_id: int) -> list[Persona]:
        return self.obtener_persona(persona_id).representados

    def listar_entrenadores(self) -> list[Persona]:
        """Personas con rol ENTRENADOR — usado por el selector de entrenador
        al crear/editar un `HorarioEntrenamiento` (dropdown con nombres
        reales en vez de un ID a mano)."""
        return self.repo.listar_por_rol(TipoRol.ENTRENADOR)

    def actualizar_persona(self, persona_id: int, cambios: PersonaUpdateDTO) -> Persona:
        persona = self.obtener_persona(persona_id)
        datos = cambios.model_dump(exclude_unset=True)
        return self.repo.actualizar(persona, datos)

    def eliminar_persona(self, persona_id: int) -> None:
        persona = self.obtener_persona(persona_id)
        self.repo.eliminar(persona)

    # --- Reportes (E01-RF010 / E04-RF014) -------------------------------------
    def reporte_por_etiquetas(
        self, prioridad_municipal: bool | None = None, becado: bool | None = None
    ) -> list[Persona]:
        return self.repo.listar_por_etiquetas(prioridad_municipal=prioridad_municipal, becado=becado)

    def reporte_nuevos_por_periodo(self, fecha_inicio, fecha_fin) -> list[Persona]:
        return self.repo.listar_nuevas_por_periodo(fecha_inicio, fecha_fin)

    def buscar_por_nombre(
        self, q: str, rol: str | None = None, skip: int = 0, limit: int = 20
    ) -> list[Persona]:
        if len(q.strip()) < 2:
            raise OperacionInvalida("La búsqueda requiere al menos 2 caracteres.")
        return self.repo.buscar_por_nombre(q=q.strip(), rol=rol, skip=skip, limit=limit)
