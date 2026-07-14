from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dominio.modelos import Membresia, TipoMembresia, Pago, ComprobantePago
from app.dominio.enums import EstadoPago, EstadoMembresia
from app.dominio.excepciones import EntidadNoEncontrada, OperacionInvalida, PermisosInsuficientes
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.membresia_repositorio import MembresiaRepositorio, TipoMembresiaRepositorio
from app.infraestructura.repositorios.pago_repositorio import PagoRepositorio, ComprobantePagoRepositorio
from app.presentacion.schemas.membresia_pago_schemas import (
    TipoMembresiaCreateDTO, MembresiaCreateDTO, PagoCreateDTO, PagoValidarDTO, ComprobantePagoCreateDTO,
)


# --- Regla Familiar E04-RF002 -----------------------------------------------
# Si una familia (mismos representados bajo el mismo representante_id) ya
# tiene 3 membresías ACTIVAS en el mismo periodo, el 4to miembro recibe
# gratuidad automática: su `monto_aplicado` se lleva a 0.
FAMILIA_UMBRAL_GRATUIDAD = 3


# --- Voucher de transferencia (adjuntado por el cliente) ---------------------
# no incluye image/webp, image/gif, image/bmp: el cliente sube evidencia de
# transferencia bancaria y se mantiene el catálogo deliberadamente acotado.
TIPOS_MIME_PERMITIDOS_VOUCHER = {"image/jpeg", "image/png", "application/pdf"}
TAMANO_MAXIMO_VOUCHER_BYTES = 5 * 1024 * 1024  # 5 MB


class MembresiaServicio:
    def __init__(self, db: Session):
        self.repo = MembresiaRepositorio(db)
        self.repo_tipo = TipoMembresiaRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)

    def crear_tipo_membresia(self, datos: TipoMembresiaCreateDTO) -> TipoMembresia:
        return self.repo_tipo.crear(TipoMembresia(**datos.model_dump()))

    def listar_tipos_membresia(self) -> list[TipoMembresia]:
        return self.repo_tipo.listar()

    def crear_membresia(self, datos: MembresiaCreateDTO) -> Membresia:
        if not self.repo_persona.obtener_por_id(datos.persona_id):
            raise EntidadNoEncontrada(f"Persona con id {datos.persona_id} no encontrada")
        if not self.repo_tipo.obtener_por_id(datos.tipo_membresia_id):
            raise EntidadNoEncontrada(f"Tipo de membresía con id {datos.tipo_membresia_id} no encontrado")
        # Estado y fecha_activacion NO vienen del payload (B-12): una membresía
        # nace INACTIVA y se ACTIVA al aprobarse su primer pago. La
        # fecha_activacion intermedia es necesaria porque la columna es NOT
        # NULL en el esquema existente; el valor real lo sobreescribe
        # `validar_pago` al aprobar.
        from datetime import datetime, timezone
        membresia = Membresia(
            estado=EstadoMembresia.INACTIVA,
            monto_aplicado=datos.monto_aplicado,
            fecha_activacion=datetime.now(timezone.utc),
            persona_id=datos.persona_id,
            tipo_membresia_id=datos.tipo_membresia_id,
        )
        return self.repo.crear(membresia)

    def obtener_membresia(self, membresia_id: int) -> Membresia:
        membresia = self.repo.obtener_por_id(membresia_id)
        if not membresia:
            raise EntidadNoEncontrada(f"Membresía con id {membresia_id} no encontrada")
        return membresia


class PagoServicio:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PagoRepositorio(db)
        self.repo_comprobante = ComprobantePagoRepositorio(db)
        self.repo_membresia = MembresiaRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)

    def registrar_pago(
        self,
        datos: PagoCreateDTO,
        persona_id_solicitante: int | None = None,
        roles_solicitante: list[str] | None = None,
    ) -> Pago:
        # Autorización primero: solo el dueño (persona_id del token ==
        # persona_id del payload) o un ADMINISTRADOR pueden registrar el pago.
        # Mismo criterio que adjuntar_voucher, para que nadie registre pagos
        # a nombre de otro. Se valida antes que la existencia de la membresía
        # para no filtrar esa información a quien no tiene permiso.
        roles_solicitante = roles_solicitante or []
        es_duenio = persona_id_solicitante is not None and persona_id_solicitante == datos.persona_id
        es_admin = "ADMINISTRADOR" in roles_solicitante
        if not (es_duenio or es_admin):
            raise PermisosInsuficientes(
                "Solo la propia persona o un administrador pueden registrar este pago"
            )

        if not self.repo_membresia.obtener_por_id(datos.membresia_id):
            raise EntidadNoEncontrada(f"Membresía con id {datos.membresia_id} no encontrada")

        pago = Pago(**datos.model_dump(), estado_pago=EstadoPago.PENDIENTE_VALIDACION)
        return self.repo.crear(pago)

    def obtener_pago(self, pago_id: int) -> Pago:
        pago = self.repo.obtener_por_id(pago_id)
        if not pago:
            raise EntidadNoEncontrada(f"Pago con id {pago_id} no encontrado")
        return pago

    def validar_pago(self, pago_id: int, datos: PagoValidarDTO) -> Pago:
        """
        Regla de negocio:
        - Aprobar un pago activa su membresía (INACTIVA/VENCIDA -> ACTIVA).
        - Rechazar un pago NO reutiliza un estado de Membresia para expresarlo
          (ese es justamente el error que corregimos: el estado de "rechazado"
          es de Pago, no de Membresia). Si la membresía ya estaba ACTIVA por un
          pago previo, rechazar un pago de renovación no debe desactivarla;
          si nunca se había activado, permanece INACTIVA.
        - Aplica E04-RF002 (gratuidad del 4to familiar) al aprobar.
        - Tras aprobar, dispara asincrónicamente la generación del comprobante
          PDF + subida a Cloudinary (vía Celery).
        """
        pago = self.obtener_pago(pago_id)
        pago.estado_pago = datos.estado_pago
        pago.motivo_rechazo = datos.motivo_rechazo
        pago.fecha_validacion = datetime.now(timezone.utc)

        if datos.estado_pago == EstadoPago.APROBADO:
            membresia = pago.membresia
            membresia.estado = EstadoMembresia.ACTIVA
            membresia.fecha_activacion = pago.fecha_validacion

            self._aplicar_regla_familiar_si_corresponde(membresia, pago)

            self.repo.guardar_cambios(pago)
            self._disparar_generacion_comprobante_pdf(pago_id)
        else:
            # EstadoPago.RECHAZADO: el estado de Membresia no cambia; el rechazo
            # queda registrado únicamente en Pago.estado_pago y Pago.motivo_rechazo.
            self.repo.guardar_cambios(pago)
        return pago

    # --- E04-RF002: gratuidad del 4to miembro -------------------------------
    def _aplicar_regla_familiar_si_corresponde(self, membresia: Membresia, pago: Pago) -> None:
        """
        Si la persona representada (alumno) tiene un representante, y ese
        representante ya tiene 3 membresías activas en el mismo periodo (solapa
        la fecha_fin de este pago), entonces este pago activa la gratuidad:
        monto_aplicado -> 0.

        La propia membresía que acabamos de activar queda incluida en el conteo
        (ya está ACTIVA y solapa), de modo que si el total familiar llega a 4
        (es el 4to miembro) aplicamos gratuidad a ESTA membresía en concreto.
        Solo aplica a personas con representante; una persona sin representante
        no entra en la regla familiar.
        """
        persona = self.repo_persona.obtener_por_id(membresia.persona_id)
        if not persona or not persona.representante_id:
            return None

        en_fecha = pago.fecha_fin
        activas_familia = self.repo_membresia.contar_membresias_activas_familia(
            persona.representante_id, en_fecha
        )

        if activas_familia >= FAMILIA_UMBRAL_GRATUIDAD + 1:
            membresia.monto_aplicado = Decimal("0.00")
        return None

    def adjuntar_comprobante(self, pago_id: int, datos: ComprobantePagoCreateDTO) -> ComprobantePago:
        pago = self.obtener_pago(pago_id)
        if pago.comprobante:
            raise OperacionInvalida("Este pago ya tiene un comprobante adjunto")
        comprobante = ComprobantePago(**datos.model_dump(), pago_id=pago_id)
        return self.repo_comprobante.crear(comprobante)

    # --- Voucher de transferencia (cliente) -----------------------------------
    def adjuntar_voucher(
        self,
        pago_id: int,
        persona_id_solicitante: int | None,
        roles_solicitante: list[str],
        contenido: bytes,
        content_type: str | None,
        nombre_archivo: str | None,
    ) -> Pago:
        """
        Adjunta (o sobrescribe) el voucher de transferencia que sube el cliente
        mientras el pago está PENDIENTE_VALIDACION. Distinto de ComprobantePago:
        ese es el PDF OFICIAL generado por el sistema al aprobar un pago
        (tarea Celery), este es la evidencia que adjunta el usuario final.

        Orden de validaciones (cada fallo lanza una excepción de dominio que
        main.py traduce al HTTP correspondiente):
          1. El pago existe (404 EntidadNoEncontrada)
          2. Pago está PENDIENTE_VALIDACION (400 OperacionInvalida)
          3. Solicitante es el dueño del pago o admin (403 PermisosInsuficientes)
          4. content_type permitido JPG/PNG/PDF (400 OperacionInvalida)
          5. tamaño <= 5 MB (400 OperacionInvalida)
          6. Subida a Cloudinary (carpeta vouchers) + commit en Pago.

        Se permite SOBREESCRIBIR un voucher ya existente mientras el pago siga
        PENDIENTE_VALIDACION (el cliente puede corregir una subida errónea).
        """
        # 1. Pago existe (lanza EntidadNoEncontrada si no).
        pago = self.obtener_pago(pago_id)

        # 2. Estado válido para adjuntar voucher.
        if pago.estado_pago != EstadoPago.PENDIENTE_VALIDACION:
            raise OperacionInvalida(
                "Solo se puede adjuntar voucher a un pago pendiente de validación"
            )

        # 3. Autorización: dueño del pago o admin.
        es_duenio = persona_id_solicitante is not None and persona_id_solicitante == pago.persona_id
        es_admin = "ADMINISTRADOR" in roles_solicitante
        if not (es_duenio or es_admin):
            raise PermisosInsuficientes(
                "Solo el titular del pago o un administrador pueden adjuntar el voucher"
            )

        # 4. Tipo MIME permitido.
        if not content_type or content_type not in TIPOS_MIME_PERMITIDOS_VOUCHER:
            raise OperacionInvalida("Formato de archivo no permitido. Use JPG, PNG o PDF")

        # 5. Tamaño máximo.
        if len(contenido) > TAMANO_MAXIMO_VOUCHER_BYTES:
            raise OperacionInvalida("El archivo excede el tamaño máximo de 5MB")

        # 6. Subida a Cloudinary y persistencia en Pago (sobrescribe si ya había).
        from app.infraestructura.cloudinary_cliente import subir_voucher_pago

        public_id = f"voucher-pago-{pago_id:08d}"
        url = subir_voucher_pago(
            contenido=contenido,
            nombre_publico=public_id,
            content_type=content_type,
            pago_id=pago_id,
        )

        # voucher_formato: guardamos el content_type exacto para distinguir
        # jpg/png/pdf en el frontend al renderizar el voucher.
        pago.voucher_url = url
        pago.voucher_formato = content_type
        pago.voucher_fecha_carga = datetime.now(timezone.utc)

        return self.repo.guardar_cambios(pago)

    # --- Disparo asíncrono del comprobante PDF -------------------------------
    def _disparar_generacion_comprobante_pdf(self, pago_id: int) -> None:
        """
        Encola la tarea Celery que genera el PDF del comprobante aprobado y lo
        sube a Cloudinary. Import diferido para evitar dependencia circular
        (celery_app importa tareas, tareas importan configuración, no servicios).
        """
        from app.infraestructura.tareas.comprobante_tareas import generar_comprobante_pdf_tarea

        generar_comprobante_pdf_tarea.delay(pago_id)
