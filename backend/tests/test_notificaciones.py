"""
Tests del servicio de notificaciones y de la tarea de recuperación de
contraseña.
"""
from unittest.mock import Mock, patch

import pytest

from app.infraestructura.notificaciones_servicio import ServicioNotificaciones
from app.infraestructura.tareas.recuperacion_tareas import enviar_enlace_recuperacion
from app.soporte_transversal.configuracion import settings


class TestServicioNotificaciones:
    @patch("app.infraestructura.notificaciones_servicio.smtplib.SMTP")
    def test_enviar_recuperacion_contrasenia_usa_smtp(self, mock_smtp_cls):
        mock_server = Mock()
        mock_smtp_cls.return_value.__enter__ = Mock(return_value=mock_server)
        mock_smtp_cls.return_value.__exit__ = Mock(return_value=False)

        with patch.object(settings, "smtp_host", "smtp.test"):
            with patch.object(settings, "smtp_port", 587):
                with patch.object(settings, "smtp_user", "user"):
                    with patch.object(settings, "smtp_password", "pass"):
                        with patch.object(settings, "frontend_url", "https://app.test"):
                            ServicioNotificaciones().enviar_recuperacion_contrasenia(
                                "user@example.com", "token123"
                            )

        mock_smtp_cls.assert_called_once_with("smtp.test", 587, timeout=10)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("user", "pass")
        mock_server.sendmail.assert_called_once()
        _, destinatario, _cuerpo = mock_server.sendmail.call_args[0]
        assert destinatario == "user@example.com"

    def test_enviar_correo_falla_si_no_hay_smtp_configurado(self):
        with patch.object(settings, "smtp_host", ""):
            with pytest.raises(RuntimeError, match="SMTP_HOST"):
                ServicioNotificaciones().enviar_correo(
                    "user@example.com", "Asunto", "cuerpo"
                )


class TestRecuperacionTarea:
    @patch("app.infraestructura.tareas.recuperacion_tareas.ServicioNotificaciones")
    def test_enviar_enlace_recuperacion_llama_al_servicio(self, mock_servicio_cls):
        mock_instancia = Mock()
        mock_servicio_cls.return_value = mock_instancia

        resultado = enviar_enlace_recuperacion("user@example.com", "token123")

        mock_instancia.enviar_recuperacion_contrasenia.assert_called_once_with(
            "user@example.com", "token123"
        )
        assert resultado == {"correo": "user@example.com", "enviado": True}
