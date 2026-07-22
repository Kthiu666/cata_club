import jwt
from sqlalchemy.orm import Session

from app.dominio.modelos import Usuario
from app.dominio.excepciones import (
    CredencialesInvalidas, EntidadNoEncontrada, EntidadDuplicada,
)
from app.infraestructura.repositorios.persona_repositorio import PersonaRepositorio
from app.infraestructura.repositorios.usuario_ficha_repositorio import UsuarioRepositorio
from app.presentacion.schemas.auth_schemas import RegistroUsuarioDTO
from app.seguridad.gestor_auth import GestorAutenticacion
from app.soporte_transversal.configuracion import settings


class AuthServicio:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UsuarioRepositorio(db)
        self.repo_persona = PersonaRepositorio(db)

    # --- Login ---------------------------------------------------------------
    def login(self, correo: str, contrasenia: str) -> dict:
        """
        Devuelve el shape estandarizado `{access_token, refresh_token, token_type}`
        para el auto-login tras autenticarse (y para reutilizarlo tras registro).
        """
        usuario = self.repo.obtener_por_correo(correo)
        if not usuario or not GestorAutenticacion.verificar_contrasenia(contrasenia, usuario.contrasenia):
            raise CredencialesInvalidas("Correo o contraseña incorrectos")
        # E01-RF013: una cuenta suspendida por el Administrador no puede
        # loguearse, aunque la contraseña sea correcta. Mismo tipo de
        # excepción que credenciales inválidas: no se revela si la cuenta
        # existe pero está inactiva vs. si la contraseña es incorrecta,
        # para no filtrar información de cuentas ajenas.
        if not usuario.activo:
            raise CredencialesInvalidas("Correo o contraseña incorrectos")

        return self._emitir_par_tokens(usuario)

    # --- Registro de usuario para una Persona ya existente -------------------
    def registrar_usuario(self, datos: RegistroUsuarioDTO) -> dict:
        """
        Crea el `Usuario` (credenciales) para una `Persona` que YA existe (dada
        de alta antes por un ADMINISTRADOR vía POST /personas). NO crea Persona.
        Sin roles asignados (coherente con la asignación perezosa de roles ya
        implementada, los roles se asignan por separado).

        Devuelve el mismo shape que `login()` (auto-login tras registro).
        """
        persona = self.repo_persona.obtener_por_cedula(datos.cedula)
        if not persona:
            raise EntidadNoEncontrada(
                "No existe una persona registrada con esa cédula. "
                "Contacte al administrador del club."
            )

        if persona.usuario is not None:
            raise EntidadDuplicada("Esta persona ya tiene una cuenta registrada")

        if self.repo.obtener_por_correo(datos.correo) is not None:
            raise EntidadDuplicada("El correo ya está en uso por otra cuenta")

        hash_contrasenia = GestorAutenticacion.obtener_hash_contrasenia(datos.contrasenia)
        nuevo_usuario = Usuario(
            correo=datos.correo,
            contrasenia=hash_contrasenia,
            persona_id=persona.id,
        )
        nuevo_usuario = self.repo.crear(nuevo_usuario)
        return self._emitir_par_tokens(nuevo_usuario)

    # --- Perfil del usuario autenticado -------------------------------------
    def obtener_usuario_actual(self, correo: str) -> Usuario:
        usuario = self.repo.obtener_por_correo(correo)
        if not usuario:
            raise CredencialesInvalidas("Token válido pero el usuario ya no existe")
        return usuario

    # --- Refresh de access token a partir de un refresh token ---------------
    def refrescar_sesion(self, refresh_token: str) -> dict:
        """
        Valida que `refresh_token` sea un JWT de tipo `refresh` (no `access`) y
        emite un nuevo access token con los roles ACTUALES del usuario (por si
        cambiaron desde la emisión del refresh original).

        Limitación documentada (extensión futura): NO hay rotación de refresh
        tokens ni blacklist de tokens revocados. Es una simplificación aceptada
        para el alcance académico del proyecto. En producción se debería:
          1) rotar el refresh token en cada uso (refresh + access nuevos)
          2) mantener una blacklist (Redis) de refresh revocados para permitir
             invalidación real de sesión antes de los 7 días de vida del token.
        """
        try:
            payload = jwt.decode(
                refresh_token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algoritmo],
            )
        except jwt.PyJWTError:
            raise CredencialesInvalidas("Refresh token inválido o expirado")

        if payload.get("type") != "refresh":
            # Protección: si mandan un access token al endpoint de refresh, se
            # rechaza. Reusa la misma excepción de dominio -> HTTP 401 vía
            # main.py (coherente con el login fallido).
            raise CredencialesInvalidas(
                "El token proporcionado no es un refresh token válido"
            )

        correo = payload.get("sub")
        if not isinstance(correo, str):
            raise CredencialesInvalidas("Refresh token inválido o expirado")

        usuario = self.repo.obtener_por_correo(correo)
        if not usuario:
            raise CredencialesInvalidas("El usuario del refresh token ya no existe")

        roles_actuales = [rol.tipo_rol.value for rol in usuario.roles]
        access_token = GestorAutenticacion.crear_token_acceso(
            {"sub": usuario.correo, "persona_id": usuario.persona_id, "roles": roles_actuales}
        )
        return {"access_token": access_token, "token_type": "bearer"}

    # --- Privado: emisión del par access + refresh -------------------------
    def _emitir_par_tokens(self, usuario: Usuario) -> dict:
        roles = [rol.tipo_rol.value for rol in usuario.roles]
        claims = {"sub": usuario.correo, "persona_id": usuario.persona_id, "roles": roles}
        access_token = GestorAutenticacion.crear_token_acceso(claims)
        # El refresh token no necesita roles (solo sirve para pedir un nuevo
        # access token; los roles se releyan del usuario en cada refresh).
        refresh_claims = {"sub": usuario.correo, "persona_id": usuario.persona_id}
        refresh_token = GestorAutenticacion.crear_token_refresco(refresh_claims)
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

    # --- E01-RF003: recuperación de contraseña -------------------------------
    def solicitar_recuperacion(self, correo: str) -> dict:
        """
        Deliberadamente NO revela si el correo existe o no (mismo mensaje de
        éxito en ambos casos) -- evita que este endpoint sirva para enumerar
        correos registrados. Si existe, dispara la tarea de Celery que
        simula el envío (ver recuperacion_tareas.py).
        """
        usuario = self.repo.obtener_por_correo(correo)
        if usuario:
            token = GestorAutenticacion.crear_token_recuperacion(
                correo, usuario.version_contrasenia
            )
            from app.infraestructura.tareas.recuperacion_tareas import enviar_enlace_recuperacion
            try:
                enviar_enlace_recuperacion.delay(correo, token)
            except Exception:
                # Sin broker de Celery disponible (ej. entorno de tests): no
                # debe tumbar la request. El envío es "best effort" por diseño.
                pass
        return {"mensaje": "Si el correo está registrado, se envió un enlace de recuperación"}

    def restablecer_contrasenia(self, token: str, nueva_contrasenia: str) -> None:
        payload = GestorAutenticacion.decodificar_token_recuperacion(token)
        correo = payload["sub"]
        version_token = payload.get("ver")
        if not isinstance(version_token, int):
            raise CredencialesInvalidas("El enlace de recuperación es inválido o expiró")

        usuario = self.repo.obtener_por_correo(correo)
        if not usuario or usuario.version_contrasenia != version_token:
            raise CredencialesInvalidas("El enlace de recuperación es inválido o expiró")

        usuario.contrasenia = GestorAutenticacion.obtener_hash_contrasenia(nueva_contrasenia)
        usuario.version_contrasenia += 1
        self.db.commit()
