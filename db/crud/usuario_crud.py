from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.usuario_model import Usuario
from schemas.usuario_schema import UsuarioCreate, UsuarioUpdate
from utils.security import get_password_hash
from models.empleado_model import Empleado
from models.roles_permisos_usuarios_model import Rol

class CRUDUsuario(CRUDBase[Usuario, UsuarioCreate, UsuarioUpdate]):
    #sobreescribimos los metodos base para meter el hashing
    def create(self, db: Session, obj_in: UsuarioCreate) -> Usuario:
        obj_in_data = obj_in.model_dump() #convertir el obj a diccionario
        
        #sacamos la contra, la pasamos a texto y la borramos del diccion
        password = obj_in_data.pop('password')
        
        #hasheamos
        obj_in_data['hashed_password'] = get_password_hash(password)
        
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(self, db: Session, *, db_obj: Usuario, obj_in: UsuarioUpdate) -> Usuario:
        update_data = obj_in.model_dump(exclude_unset=True) #ignoramos campos vacios si es que hay
        
        # si se intenta actualizar la contra la hashea
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            update_data["hashed_password"] = hashed_password
            # eliminamos la contraseña en texto
            del update_data["password"]

        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        # llamamos a la base para actualizar los campos
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def get_usuarios_con_detalles(self, db: Session, skip: int = 0, limit: int = 100):
        resultados = db.query(
            self.model.id,
            self.model.email,
            self.model.activo,
            self.model.created_at,
            Empleado.nombre.label("empleado_nombre"),
            Empleado.apellido.label("empleado_apellido"),
            self.model.empleado_cedula,
            self.model.rol_id.label("rol_id"),
            Rol.nombre.label("rol_nombre")
        ).join(
            Empleado, self.model.empleado_cedula == Empleado.cedula
        ).join(
            Rol, self.model.rol_id == Rol.id
        ).offset(skip).limit(limit).all()

        return [
            {
                "id": r.id,
                "email": r.email,
                "activo": r.activo,
                "created_at": r.created_at,
                "empleado_nombre": r.empleado_nombre,
                "empleado_apellido": r.empleado_apellido,
                "empleado_cedula": r.empleado_cedula,
                "rol_id": r.rol_id,
                "rol_nombre": r.rol_nombre
            }
            for r in resultados
        ]
    
#instancia
crud_usuario = CRUDUsuario(Usuario)