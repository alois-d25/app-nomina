from typing import Any
from datetime import date
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.empleado_model import Empleado, EstadoEmpleado
from models.evento_empleado_model import EventoEmpleado, TipoEvento
from models.usuario_model import Usuario
from schemas.empleado_schema import EmpleadoCreate, EmpleadoUpdate

class CRUDEmpleado(CRUDBase[Empleado, EmpleadoCreate, EmpleadoUpdate]):
    def create(self, db: Session, obj_in: EmpleadoCreate) -> Empleado:
        # La cédula es la llave primaria: no se permiten duplicados.
        if db.get(self.model, obj_in.cedula):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esta cédula ya está registrada",
            )
        # El correo tampoco puede repetirse entre empleados.
        if db.query(self.model).filter(self.model.email == obj_in.email).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este correo ya está registrado",
            )
        return super().create(db, obj_in=obj_in)

    def get_all(self, db: Session, skip: int = 0, limit: int = 100):
        # Antes de listar, sincronizamos los estados según las vacaciones vigentes.
        self._sync_estados_por_vacaciones(db)
        return super().get_all(db, skip=skip, limit=limit)

    def _sync_estados_por_vacaciones(self, db: Session) -> None:
        """
        Mantiene al día el estado de los empleados según sus eventos de vacaciones:
        - Si hoy cae dentro de una vacación y el empleado no está en 'permiso' -> 'permiso'.
        - Si está en 'permiso' pero su vacación ya terminó y no tiene otra vigente -> 'activo'.

        Se ejecuta cada vez que se carga la lista de empleados. Solo se regresa a 'activo'
        a quienes tienen alguna vacación ya terminada, para no tocar 'permiso' de otro origen.
        """
        hoy = date.today()

        vacaciones = (
            db.query(EventoEmpleado)
            .filter(EventoEmpleado.tipo_evento == TipoEvento.vacaciones)
            .all()
        )

        con_vacacion_activa = set()
        con_vacacion_terminada = set()
        for v in vacaciones:
            if not v.fecha_inicio or not v.fecha_fin:
                continue
            if v.fecha_inicio <= hoy <= v.fecha_fin:
                con_vacacion_activa.add(v.empleado_cedula)
            elif v.fecha_fin < hoy:
                con_vacacion_terminada.add(v.empleado_cedula)

        cedulas = con_vacacion_activa | con_vacacion_terminada
        if not cedulas:
            return

        empleados = db.query(Empleado).filter(Empleado.cedula.in_(cedulas)).all()
        cambios = False
        for emp in empleados:
            if emp.cedula in con_vacacion_activa:
                if emp.estado != EstadoEmpleado.permiso:
                    emp.estado = EstadoEmpleado.permiso
                    cambios = True
            elif emp.estado == EstadoEmpleado.permiso and emp.cedula in con_vacacion_terminada:
                emp.estado = EstadoEmpleado.activo
                cambios = True

        if cambios:
            db.commit()

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



