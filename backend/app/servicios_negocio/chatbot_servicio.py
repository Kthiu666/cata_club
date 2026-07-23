"""
Servicio del chatbot de FAQ (asistente de navegación de la app).

MVP intencionalmente simple: no hay RAG ni vector store. El contenido de las
preguntas frecuentes se embebe directo en el system prompt (constante
`_FAQ_CONTENIDO` de este módulo) porque no hay volumen de contenido que
justifique algo más sofisticado. No toca la base de datos.

Proveedor: DeepSeek servido a través del gateway OpenAI-compatible
"OpenCode Zen" (https://opencode.ai/zen/v1). Se usa el paquete `openai`
apuntado a ese `base_url` — es el cliente idiomático para cualquier gateway
OpenAI-compatible (retries y excepciones tipadas gratis), en vez de
reimplementar la llamada HTTP a mano.

MODELO_CHATBOT = "deepseek-v4-flash-free" (tier gratuito) es TEMPORAL, solo
para la demo — la suscripción paga "OpenCode Go" (modelo `deepseek-v4-flash`
contra el endpoint propio https://opencode.ai/zen/go/v1) está sin crédito
disponible. Cuando se resuelva el billing de Go, volver a `deepseek-v4-flash`
+ `https://opencode.ai/zen/go/v1`.
"""
from typing import List, Optional

import openai
from fastapi import HTTPException, status

from app.soporte_transversal.configuracion import settings

OPENCODE_ZEN_BASE_URL = "https://opencode.ai/zen/v1"
MODELO_CHATBOT = "deepseek-v4-flash-free"
MAX_TOKENS_RESPUESTA = 1024
MAX_TURNOS_HISTORIAL = 6

# --- Contenido de las FAQ, embebido directo en el system prompt -------------
_FAQ_CONTENIDO = """
Generales:
- Para iniciar sesión, el usuario ingresa su correo y contraseña en la pantalla de login. Si olvidó la
  contraseña, existe recuperación de contraseña vía correo electrónico desde la misma pantalla de login.
- Cada rol ve una parte distinta de la app: el administrador tiene acceso completo a la gestión del club
  (miembros, grupos, pagos, asistencia, niveles, reportes); el entrenador ve solo lo referido a su/s
  grupo/s (tomar asistencia, historial de asistencia, nivel técnico de sus alumnos); el
  representante/estudiante ve únicamente "Mi Cuenta", con su propia información.

Representante/Estudiante (sección "Mi Cuenta", ruta /student):
- Puede ver el estado de sus pagos y de su membresía desde "Mi Cuenta".
- Puede consultar su propio historial de asistencia desde "Mi Cuenta".
- La ficha médica (alergias, contacto de emergencia) la gestiona el ADMINISTRADOR, no el propio
  estudiante/representante directamente — si necesita actualizarla, debe pedírselo a un administrador.

Entrenador (rutas /trainer, /trainer/attendance, /trainer/attendance/history, /trainer/nivel):
- Toma la asistencia de su grupo desde /trainer/attendance.
- Puede ver el historial de asistencia que él mismo cargó desde /trainer/attendance/history.
- Puede actualizar el nivel técnico (principiante, intermedio o avanzado) de un alumno desde /trainer/nivel.

Administrador (rutas /dashboard, /members, /groups, /payments, /attendance, /reports, /ranking):
- Gestiona horarios y grupos desde la sección "Gestión de Horarios" (/groups).
- Registra pagos y membresías desde /payments.
- Genera reportes desde /reports.
- La sección Ranking (/ranking) ya no es una clasificación competitiva: es donde se asignan alumnos a
  niveles/grupos de entrenamiento (principiante, intermedio, avanzado), con un cupo mínimo y máximo por
  nivel.
""".strip()

_INSTRUCCIONES = """
Sos el asistente virtual de "Cata Club", una app de gestión de un club deportivo (asistencias, clases
extra, membresías y pagos, fichas médicas, rankings, horarios y grupos). Tu única función es ayudar a
los usuarios a entender CÓMO USAR la app, basándote exclusivamente en la información de FAQ que se te
da a continuación.

Reglas:
1. Respondé solo preguntas sobre cómo usar la app, apoyándote en el contenido de FAQ provisto. Si la
   pregunta no está cubierta por esa información, decí que no contás con esa información y sugerí
   contactar a un administrador del club — nunca inventes funcionalidades ni rutas que no aparecen ahí.
2. Sé conciso: respondé en pocas oraciones, no en muros de texto.
3. Respondé siempre en el mismo idioma en el que escribe el usuario; si no podés determinarlo, respondé
   en español.
""".strip()

SYSTEM_PROMPT = f"{_INSTRUCCIONES}\n\n--- FAQ de Cata Club ---\n{_FAQ_CONTENIDO}"

_ROLES_VALIDOS = {"usuario": "user", "asistente": "assistant"}


class ChatbotServicio:
    """Envuelve la llamada al gateway OpenCode Zen (OpenAI-compatible) para
    el chatbot de FAQ."""

    def __init__(self) -> None:
        # settings.opencode_api_key viene de OPENCODE_API_KEY en .env (vía
        # Settings/pydantic-settings, igual que el resto de la config de la
        # app) — os.environ.get(...) directo NO se popula solo desde .env,
        # así que hay que pasarlo explícito al cliente openai (a diferencia
        # de anthropic.Anthropic(), que sí lee la env var automáticamente).
        self._client = openai.OpenAI(
            base_url=OPENCODE_ZEN_BASE_URL,
            api_key=settings.opencode_api_key,
        )

    def consultar(self, mensaje: str, historial: Optional[List[dict]] = None) -> str:
        mensajes = self._construir_mensajes(mensaje, historial)
        try:
            respuesta = self._client.chat.completions.create(
                model=MODELO_CHATBOT,
                max_tokens=MAX_TOKENS_RESPUESTA,
                messages=mensajes,
            )
        except (openai.APIError, openai.APIConnectionError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo contactar al asistente. Intentá de nuevo en un momento.",
            ) from exc

        return respuesta.choices[0].message.content or ""

    @staticmethod
    def _construir_mensajes(mensaje: str, historial: Optional[List[dict]]) -> List[dict]:
        """Mapea `historial` (turnos {rol, texto} del cliente) a mensajes
        user/assistant alternados, tomando solo los últimos N para acotar
        tokens/costo. Si el historial es inválido o no arranca en "usuario"
        (rompería la alternancia user-first), se descarta por completo y se
        trata como un turno nuevo — nunca se rompe la request por un
        historial malformado. Esta lógica es agnóstica del proveedor (no
        depende de la forma Anthropic/OpenAI de los mensajes), por eso se
        reusa tal cual del servicio anterior.

        El primer mensaje de la lista es siempre el system prompt — en la
        API OpenAI-compatible el system prompt va como un mensaje más
        (role="system"), no como un parámetro top-level separado."""
        turnos: List[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

        if isinstance(historial, list) and historial:
            recortado = historial[-MAX_TURNOS_HISTORIAL:]
            candidatos: List[dict] = []
            valido = True
            rol_esperado = "user"
            for turno in recortado:
                if not isinstance(turno, dict):
                    valido = False
                    break
                rol_crudo = turno.get("rol")
                texto = turno.get("texto")
                rol_api = _ROLES_VALIDOS.get(rol_crudo)
                if rol_api is None or not isinstance(texto, str) or not texto.strip():
                    valido = False
                    break
                if rol_api != rol_esperado:
                    valido = False
                    break
                candidatos.append({"role": rol_api, "content": texto})
                rol_esperado = "assistant" if rol_esperado == "user" else "user"

            if valido:
                turnos.extend(candidatos)

        turnos.append({"role": "user", "content": mensaje})
        return turnos
