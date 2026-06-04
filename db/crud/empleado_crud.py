from typing import Any
from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.empleado_model import Empleado
from models.usuario_model import Usuario
from schemas.empleado_schema import EmpleadoCreate, EmpleadoUpdate

class CRUDEmpleado(CRUDBase[Empleado, EmpleadoCreate, EmpleadoUpdate]):
    def get_empleados_sin_usuario(self, db: Session):
        # Trae a los empleados donde no exista un registro en Usuario con su cédula
        return db.query(self.model).outerjoin(
            Usuario, self.model.cedula == Usuario.empleado_cedula
        ).filter(Usuario.id.is_(None)).all()
        
    def remove(self, db: Session, *, id: Any) -> Empleado:
        empleado_obj = db.get(self.model, id)
        if not empleado_obj:
            return None

        usuario_asociado = db.query(Usuario).filter(Usuario.empleado_cedula == id).first()
        
        if usuario_asociado:
            db.delete(usuario_asociado)
            db.flush() 

        db.delete(empleado_obj)
        db.commit()
        
        return empleado_obj

    def get_employees_with_filters(nivel:str|None,cargo:str|None,activo:bool|None,skip: int = 0, limit: int = 10):
        return crud_empleado.get_multi(skip=skip, limit=limit);


# Creamos la instancia inyectando los modelos y schemas específicos
crud_empleado = CRUDEmpleado(Empleado)



