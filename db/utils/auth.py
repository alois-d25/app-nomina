# utils/auth.py
# Dependencias de autenticación/autorización para proteger los endpoints.
# El token viaja en el header HTTP: Authorization: Bearer <token>
from fastapi import Request, HTTPException, status, Depends
from utils.security import decode_access_token


def get_bearer_token(request: Request) -> str | None:
    """Extrae el token JWT del header Authorization (esquema Bearer)."""
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    # Si solo mandan el token sin el prefijo, lo aceptamos igual
    return auth_header.strip() or None


def get_current_payload(request: Request) -> dict:
    """Valida el JWT del header Authorization y devuelve su payload.

    Lanza 401 si no hay token o es inválido/expirado.
    """
    token = get_bearer_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado: sesión no iniciada",
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    return payload


def require_permission(*permisos_requeridos: str):
    """Crea una dependencia que exige que el usuario tenga TODOS los permisos dados.

    Uso: dependencies=[Depends(require_permission("usuarios:crear"))]
    """
    def checker(payload: dict = Depends(get_current_payload)) -> dict:
        permisos_usuario = payload.get("permisos") or []
        faltantes = [p for p in permisos_requeridos if p not in permisos_usuario]
        if faltantes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permiso para esta acción (requiere: {', '.join(permisos_requeridos)})",
            )
        return payload

    return checker
