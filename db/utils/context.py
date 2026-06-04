# utils/context.py
from contextvars import ContextVar

# Estas variables guardarán el ID del usuario y su IP de forma segura para cada petición concurrente
current_user_id: ContextVar[int | None] = ContextVar("current_user_id", default=None)
current_user_ip: ContextVar[str | None] = ContextVar("current_user_ip", default=None)