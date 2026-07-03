# app/servicios_negocio/servicio_pagos.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.dominio.modelos_orm import Pago, Membresia, EstadoPago, EstadoMembresia

class ServicioPagos:
    def __init__(self, db: Session):
        self.db = db

    def obtener_pendientes_validacion(self):
        """
        Devuelve la lista de pagos que el Administrador debe revisar.
        """
        return self.db.query(Pago).filter(Pago.estado_validacion == EstadoPago.PENDIENTE_VALIDACION).all()

    def aprobar_comprobante(self, pago_id: int, admin_id: int):
        """
        Flujo principal del Diagrama de Secuencia:
        Valida el pago y actualiza la membresía asociada.
        """
        pago = self.db.query(Pago).filter(Pago.id == pago_id).first()
        
        if not pago:
            raise HTTPException(status_code=404, detail="El pago especificado no existe.")
            
        if pago.estado_validacion == EstadoPago.APROBADO:
            raise HTTPException(status_code=400, detail="Este comprobante ya ha sido aprobado.")

        # Regla 1: Cambiar estado del pago
        pago.estado_validacion = EstadoPago.APROBADO

        # Regla 2: Efecto colateral -> Activar la membresía del alumno
        if pago.membresia_id:
            membresia = self.db.query(Membresia).filter(Membresia.id == pago.membresia_id).first()
            if membresia:
                membresia.estado = EstadoMembresia.ACTIVA
                # Aquí iría la lógica para extender la fecha_vencimiento 30 días más

        self.db.commit()
        self.db.refresh(pago)
        
        # En un sistema real, aquí guardaríamos un log de auditoría con el admin_id
        return pago