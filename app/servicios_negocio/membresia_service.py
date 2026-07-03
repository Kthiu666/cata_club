from datetime import datetime, timezone
from fastapi import HTTPException

from app.dominio.modelos import Membresia, Pago, ComprobantePago, TipoMembresia
from app.dominio.enums import EstadoPago, EstadoMembresia
from app.infraestructura.repositorios.membresia_repositorio import MembresiaRepositorio
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.presentacion.schemas.membresia_pago_schemas import (
    MembresiaCreateDTO, PagoCreateDTO, PagoValidarDTO,
    ComprobantePagoCreateDTO, TipoMembresiaCreateDTO,
)


class MembresiaService:
    def __init__(self, repositorio: MembresiaRepositorio, persona_repositorio: PersonaRepositorio):
        self.repositorio = repositorio
        self.persona_repositorio = persona_repositorio

    # --- TipoMembresia ---
    def crear_tipo_membresia(self, datos: TipoMembresiaCreateDTO) -> TipoMembresia:
        tipo = TipoMembresia(**datos.model_dump())
        return self.repositorio.guardar_tipo(tipo)

    def listar_tipos_membresia(self) -> list[TipoMembresia]:
        return self.repositorio.listar_tipos()

    # --- Membresia ---
    def crear_membresia(self, datos: MembresiaCreateDTO) -> Membresia:
        if not self.persona_repositorio.obtener_por_id(datos.persona_id):
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        if not self.repositorio.obtener_tipo_por_id(datos.tipo_membresia_id):
            raise HTTPException(status_code=404, detail="Tipo de membresía no encontrado")
        membresia = Membresia(**datos.model_dump())
        return self.repositorio.guardar_membresia(membresia)

    def obtener_membresia(self, membresia_id: int) -> Membresia:
        membresia = self.repositorio.obtener_membresia_por_id(membresia_id)
        if not membresia:
            raise HTTPException(status_code=404, detail="Membresía no encontrada")
        return membresia

    # --- Pago ---
    def registrar_pago(self, datos: PagoCreateDTO) -> Pago:
        """Cualquier usuario autenticado puede registrar su comprobante de pago;
        la validación (aprobar/rechazar) queda restringida al administrador."""
        if not self.repositorio.obtener_membresia_por_id(datos.membresia_id):
            raise HTTPException(status_code=404, detail="Membresía no encontrada")
        pago = Pago(**datos.model_dump(), estado_pago=EstadoPago.PENDIENTE_VALIDACION)
        return self.repositorio.guardar_pago(pago)

    def validar_pago(self, pago_id: int, datos: PagoValidarDTO) -> Pago:
        pago = self.repositorio.obtener_pago_por_id(pago_id)
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")

        pago.estado_pago = datos.estado_pago
        pago.motivo_rechazo = datos.motivo_rechazo
        pago.fecha_validacion = datetime.now(timezone.utc)

        # Regla de negocio: si el pago se aprueba, la membresía asociada pasa a ACTIVA
        if datos.estado_pago == EstadoPago.APROBADO:
            pago.membresia.estado = EstadoMembresia.ACTIVA
        elif datos.estado_pago == EstadoPago.RECHAZADO:
            pago.membresia.estado = EstadoMembresia.PENDIENTE_PAGO

        return self.repositorio.actualizar_pago(pago)

    def obtener_pago(self, pago_id: int) -> Pago:
        pago = self.repositorio.obtener_pago_por_id(pago_id)
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        return pago

    # --- ComprobantePago ---
    def adjuntar_comprobante(self, pago_id: int, datos: ComprobantePagoCreateDTO) -> ComprobantePago:
        pago = self.repositorio.obtener_pago_por_id(pago_id)
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        if pago.comprobante:
            raise HTTPException(status_code=400, detail="Este pago ya tiene un comprobante adjunto")
        comprobante = ComprobantePago(**datos.model_dump())
        return self.repositorio.guardar_comprobante(comprobante)