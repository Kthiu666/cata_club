"""
Enumeraciones del dominio "Sistema Integral de Administración para Cata Club".
Extraídas directamente del diagrama de clases (APE 13).
"""
import enum


class NivelTecnicoAlumno(str, enum.Enum):
    NIVEL_1 = "NIVEL_1"
    NIVEL_2 = "NIVEL_2"
    NIVEL_3 = "NIVEL_3"
    NIVEL_4 = "NIVEL_4"
    NIVEL_5 = "NIVEL_5"
    NIVEL_6 = "NIVEL_6"
    NIVEL_7 = "NIVEL_7"
    NIVEL_8 = "NIVEL_8"
    NIVEL_9 = "NIVEL_9"
    NIVEL_10 = "NIVEL_10"


class TipoRol(str, enum.Enum):
    ALUMNO = "ALUMNO"
    ENTRENADOR = "ENTRENADOR"
    ADMINISTRADOR = "ADMINISTRADOR"


class TipoEscuela(str, enum.Enum):
    PARTICULAR = "PARTICULAR"
    FISCAL = "FISCAL"
    FISCOMISIONAL = "FISCOMISIONAL"
    MUNICIPAL = "MUNICIPAL"


class TipoSangre(str, enum.Enum):
    A_POSITIVO = "A_POSITIVO"
    A_NEGATIVO = "A_NEGATIVO"
    B_POSITIVO = "B_POSITIVO"
    B_NEGATIVO = "B_NEGATIVO"
    AB_POSITIVO = "AB_POSITIVO"
    AB_NEGATIVO = "AB_NEGATIVO"
    O_POSITIVO = "O_POSITIVO"
    O_NEGATIVO = "O_NEGATIVO"
    DESCONOCIDO = "DESCONOCIDO"


class LicenciaEntrenador(str, enum.Enum):
    NIVEL_1 = "NIVEL_1"
    NIVEL_2 = "NIVEL_2"
    NIVEL_3 = "NIVEL_3"


class EstadoAsistencia(str, enum.Enum):
    PRESENTE = "PRESENTE"
    AUSENTE = "AUSENTE"
    ATRASADO = "ATRASADO"
    JUSTIFICADO = "JUSTIFICADO"


class EstadoMembresia(str, enum.Enum):
    ACTIVA = "ACTIVA"
    VENCIDA = "VENCIDA"
    PENDIENTE_PAGO = "PENDIENTE_PAGO"


class TipoModalidad(str, enum.Enum):
    PERSONALIZADA = "PERSONALIZADA"
    MENSUAL = "MENSUAL"


class EstadoPago(str, enum.Enum):
    APROBADO = "APROBADO"
    PENDIENTE_VALIDACION = "PENDIENTE_VALIDACION"
    RECHAZADO = "RECHAZADO"


class TipoPago(str, enum.Enum):
    EFECTIVO = "EFECTIVO"
    TRANSFERENCIA = "TRANSFERENCIA"
