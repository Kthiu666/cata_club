"""Infraestructura de automatización: tareas Celery y configuración del
worker/beat. Vive en `infraestructura` porque es un adaptador de mensajería:
el dominio no conoce Celery ni Redis, solo servicios puramente síncronos."""
