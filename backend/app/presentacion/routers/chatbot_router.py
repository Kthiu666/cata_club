"""
Router del chatbot de FAQ (asistente de navegación de la app).

Endpoint público (sin auth): no expone datos personales ni sensibles, es un
helper estático de FAQ. Rate-limited porque cada llamada tiene costo (gateway
OpenCode Go / DeepSeek).
"""
from fastapi import APIRouter, Request

from app.presentacion.schemas.chatbot_schemas import ChatbotConsultaDTO, ChatbotRespuestaDTO
from app.servicios_negocio.chatbot_servicio import ChatbotServicio
from app.soporte_transversal.rate_limit import limiter

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/consultar", response_model=ChatbotRespuestaDTO)
@limiter.limit("15/minute")
async def consultar(request: Request, datos: ChatbotConsultaDTO):
    respuesta = ChatbotServicio().consultar(datos.mensaje, datos.historial)
    return {"respuesta": respuesta}
