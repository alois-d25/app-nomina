from sqlalchemy.orm import Session

from models.roles_permisos_usuarios_model import Permiso, Rol


# Obtener todos los roles
def get_all_roles(db: Session):
    return db.query(Rol).all()

# Obtener un rol por ID (por si lo necesitas)
def get_rol_by_id(db: Session, rol_id: int):
    return db.query(Rol).filter(Rol.id == rol_id).first()

# Obtener todos los permisos
def get_all_permisos(db: Session):
    return db.query(Permiso).all()