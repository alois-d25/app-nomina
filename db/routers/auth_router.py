from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models.usuario_model import Usuario
from models.roles_permisos_usuarios_model import Rol
from models.auditoria_model import Auditoria, AccionAuditoria
from utils.security import verify_password, create_access_token, decode_access_token
from utils.auth import get_bearer_token
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/login", tags=["Login"])

# Schema temporal solo para recibir los datos del login
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def registrar_evento_sesion(db: Session, usuario_id: int, accion: AccionAuditoria, request: Request):
    """Registra un evento de sesión (LOGIN/LOGOUT) en la tabla de auditorías."""
    ip = request.client.host if request.client else None
    db.add(Auditoria(
        usuario_id=usuario_id,
        tabla_afectada="usuarios",
        registro_id=str(usuario_id),
        accion=accion,
        ip_usuario=ip,
    ))
    db.commit()


def build_user_payload(user: Usuario, rol: Rol | None):
    permisos_lista = []
    if rol:
        permisos_lista = [rp.permiso.nombre for rp in rol.rol_permisos]

    return {
        "sub": str(user.id),
        "email": user.email,
        "cedula": user.empleado_cedula,
        "rol_nombre": rol.nombre if rol else None,
        "permisos": permisos_lista,
    }

@router.post("/login")
def login(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    logger.info(f"[LOGIN] Intento de login con email: {credentials.email}")

    # Intentar autenticar - no revelar si el usuario no existe o la contraseña es incorrecta
    user = db.query(Usuario).filter(Usuario.email == credentials.email).first()

    # Validar usuario existe, esté activo Y contraseña sea correcta
    if not user or not user.activo or not verify_password(credentials.password, user.hashed_password):
        logger.warning(f"[LOGIN] Intento de login fallido para email: {credentials.email}")
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Si llegamos aquí, el usuario es válido
    logger.info(f"[LOGIN] Usuario autenticado: {user.email}")

    # Extraer su rol y construir la lista de permisos exactos
    rol = db.query(Rol).filter(Rol.id == user.rol_id).first()
    logger.info(f"[LOGIN] Rol encontrado: {rol.nombre if rol else 'Sin rol'}")

    token_data = build_user_payload(user, rol)
    logger.info(f"[LOGIN] Token data construido: {token_data}")

    # Generar y retornar el token (el frontend lo guarda en localStorage)
    access_token = create_access_token(token_data)
    logger.info(f"[LOGIN] Token generado exitosamente para {user.email}")

    # Registrar el inicio de sesión para el conteo de sesiones activas
    registrar_evento_sesion(db, user.id, AccionAuditoria.LOGIN, request)
    logger.info(f"[LOGIN] Evento de sesión registrado para {user.email}")

    logger.info(f"[LOGIN] Login exitoso para {user.email}")
    return {
        "message": "Login exitoso",
        "user": token_data,
        "token": access_token,
    }


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    logger.info("[ME] Validando sesión del usuario")

    # El token viaja en el header Authorization: Bearer <token>
    token = get_bearer_token(request)
    if not token:
        logger.warning("[ME] No se encontró token en el header Authorization")
        raise HTTPException(status_code=401, detail="Sesión no iniciada")

    logger.info("[ME] Token encontrado, decodificando...")
    payload = decode_access_token(token)
    if not payload:
        logger.warning("[ME] Token inválido o expirado")
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("[ME] No se encontró 'sub' en el payload del token")
        raise HTTPException(status_code=401, detail="Token inválido")

    logger.info(f"[ME] User ID del token: {user_id}")
    user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()

    if not user:
        logger.warning(f"[ME] Usuario con ID {user_id} no encontrado")
        raise HTTPException(status_code=401, detail="Usuario no válido o inactivo")

    if not user.activo:
        logger.warning(f"[ME] Usuario {user.email} inactivo")
        raise HTTPException(status_code=401, detail="Usuario no válido o inactivo")

    rol = db.query(Rol).filter(Rol.id == user.rol_id).first()
    logger.info(f"[ME] Sesión validada para {user.email}")
    return {"user": build_user_payload(user, rol)}


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    logger.info("[LOGOUT] Procesando cierre de sesión")

    # Sin estado en el servidor: el frontend elimina el token de localStorage.
    # Registramos el cierre de sesión (si hay un token válido) para el conteo de sesiones activas.
    token = get_bearer_token(request)
    if token:
        logger.info("[LOGOUT] Token encontrado, decodificando para registrar evento")
        payload = decode_access_token(token)
        user_id = payload.get("sub") if payload else None
        if user_id:
            registrar_evento_sesion(db, int(user_id), AccionAuditoria.LOGOUT, request)
            logger.info(f"[LOGOUT] Evento de cierre de sesión registrado para usuario ID: {user_id}")
        else:
            logger.warning("[LOGOUT] No se pudo obtener user_id del token")
    else:
        logger.warning("[LOGOUT] No se encontró token en el request")

    logger.info("[LOGOUT] Sesión cerrada")
    return {"message": "Sesión cerrada"}