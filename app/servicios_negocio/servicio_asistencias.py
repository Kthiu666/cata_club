from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.dominio.modelos import Asistencia, HorarioEntrenamiento, Persona
from app.presentacion.schemas.asistencia_schemas import AsistenciaCreateDTO, HorarioCreateDTO

class ServicioAsistencias:
    def __init__(self, db: Session):
        self.db = db

    def crear_horario(self, datos: HorarioCreateDTO) -> HorarioEntrenamiento:
        if datos.hora_inicio >= datos.hora_fin:
            raise HTTPException(status_code=400, detail="La hora de inicio debe ser anterior a la hora de fin")
        
        horario = HorarioEntrenamiento(**datos.model_dump())
        self.db.add(horario)
        self.db.commit()
        self.db.refresh(horario)
        return horario

    def registrar_asistencia(self, datos: AsistenciaCreateDTO) -> Asistencia:
        if not self.db.get(Persona, datos.persona_id):
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        if not self.db.get(HorarioEntrenamiento, datos.horario_id):
            raise HTTPException(status_code=404, detail="Horario no encontrado")
            
        asistencia = Asistencia(**datos.model_dump())
        self.db.add(asistencia)
        self.db.commit()
        self.db.refresh(asistencia)
        return asistencia

    def obtener_historial_persona(self, persona_id: int):
        persona = self.db.get(Persona, persona_id)
        if not persona:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        return persona.asistencias

    def listar_horarios(self):
        return self.db.query(HorarioEntrenamiento).all()