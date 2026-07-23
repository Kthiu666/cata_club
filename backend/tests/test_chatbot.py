"""
Tests del endpoint público del chatbot de FAQ (POST /api/v1/chatbot/consultar).

Mockea el cliente `openai.OpenAI` (apuntado al gateway OpenCode Zen; no pega
contra la API real). Cubre:
  - Request válido -> 200 con campo `respuesta`.
  - `mensaje` vacío -> 422 (validación de Pydantic).
"""
from types import SimpleNamespace

import app.servicios_negocio.chatbot_servicio as chatbot_servicio_mod


class _FakeCompletions:
    def __init__(self, texto: str):
        self._texto = texto

    def create(self, **kwargs):
        mensaje = SimpleNamespace(content=self._texto)
        choice = SimpleNamespace(message=mensaje)
        return SimpleNamespace(choices=[choice])


class _FakeChat:
    def __init__(self, texto: str):
        self.completions = _FakeCompletions(texto)


class _FakeOpenAIClient:
    def __init__(self, texto: str = "Podés ver tus pagos en Mi Cuenta.", **kwargs):
        self.chat = _FakeChat(texto)


def _mockear_cliente_openai(monkeypatch, texto: str = "Podés ver tus pagos en Mi Cuenta."):
    monkeypatch.setattr(
        chatbot_servicio_mod.openai,
        "OpenAI",
        lambda **kwargs: _FakeOpenAIClient(texto, **kwargs),
    )


def test_consultar_responde_200_con_respuesta(client, monkeypatch):
    _mockear_cliente_openai(monkeypatch)

    resp = client.post("/api/v1/chatbot/consultar", json={"mensaje": "¿Cómo veo mis pagos?"})

    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "respuesta" in data
    assert data["respuesta"] == "Podés ver tus pagos en Mi Cuenta."


def test_consultar_con_historial_responde_200(client, monkeypatch):
    _mockear_cliente_openai(monkeypatch, texto="Sí, claro.")

    resp = client.post(
        "/api/v1/chatbot/consultar",
        json={
            "mensaje": "¿Y las clases extra?",
            "historial": [
                {"rol": "usuario", "texto": "Hola"},
                {"rol": "asistente", "texto": "Hola, ¿en qué te ayudo?"},
            ],
        },
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["respuesta"] == "Sí, claro."


def test_consultar_mensaje_vacio_da_422(client, monkeypatch):
    _mockear_cliente_openai(monkeypatch)

    resp = client.post("/api/v1/chatbot/consultar", json={"mensaje": ""})

    assert resp.status_code == 422
