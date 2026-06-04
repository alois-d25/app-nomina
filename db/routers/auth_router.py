from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models.usuario_model import Usuario
from models.roles_permisos_usuarios_model import Rol
from utils.security import verify_password, create_access_token, decode_access_token
from utils.auth import get_bearer_token

router = APIRouter(prefix="/login", tags=["Login"])

# Schema temporal solo para recibir los datos del login
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # 1. Buscar al usuario
    user = db.query(Usuario).filter(Usuario.email == request.email).first()
    
    # Validamos que exista y esté activo
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Credenciales inválidas o usuario inactivo")

    # 2. Verificar la contraseña con bcrypt
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # 3. Extraer su rol y construir la lista de permisos exactos
    rol = db.query(Rol).filter(Rol.id == user.rol_id).first()
    token_data = build_user_payload(user, rol)

    # 5. Generar y retornar el token (el frontend lo guarda en localStorage)
    access_token = create_access_token(token_data)

    return {
        "message": "Login exitoso",
        "user": token_data,
        "token": access_token,
    }


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    # El token viaja en el header Authorization: Bearer <token>
    token = get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Sesión no iniciada")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if not user or not user.activo:
        raise HTTPException(status_code=401, detail="Usuario no válido o inactivo")

    rol = db.query(Rol).filter(Rol.id == user.rol_id).first()
    return {"user": build_user_payload(user, rol)}


@router.post("/logout")
def logout():
    # Sin estado en el servidor: el frontend elimina el token de localStorage.
    return {"message": "Sesión cerrada"}