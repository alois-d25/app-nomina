# auditoria_crud.py
from datetime import datetime
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.auditoria_model import Auditoria, AccionAuditoria
from models.usuario_model import Usuario
from models.empleado_model import Empleado
from schemas.auditoria_schema import AuditoriaCreate, AuditoriaUpdate

class CRUDAuditoria(CRUDBase[Auditoria, AuditoriaCreate, AuditoriaUpdate]):

    def get_auditorias_con_detalles(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 20,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None,
        accion: Optional[str] = None,
        tabla: Optional[str] = None,
    ) -> Tuple[List[dict], int]:
        query = db.query(
            Auditoria.id,
            Auditoria.fecha,
            Auditoria.accion,
            Auditoria.tabla_afectada,
            Empleado.nombre,
            Empleado.apellido,
            Usuario.email
        ).outerjoin(
            Usuario, Auditoria.usuario_id == Usuario.id
        ).outerjoin(
            Empleado, Usuario.empleado_cedula == Empleado.cedula
        )

        if fecha_desde:
            query = query.filter(Auditoria.fecha >= fecha_desde)
        if fecha_hasta:
            query = query.filter(Auditoria.fecha <= fecha_hasta)
        if accion:
            try:
                query = query.filter(Auditoria.accion == AccionAuditoria(accion))
            except ValueError:
                pass
        if tabla:
            query = query.filter(Auditoria.tabla_afectada.ilike(f"%{tabla}%"))

        total = query.count()

        resultados = query.order_by(Auditoria.fecha.desc()).offset(skip).limit(limit).all()

        lista_auditorias = []
        for r in resultados:
            if r.nombre and r.apellido:
                nombre_operador = f"{r.nombre} {r.apellido}"
            elif r.email:
                nombre_operador = r.email
            else:
                nombre_operador = "Sistema (Auto)"

            lista_auditorias.append({
                "id": r.id,
                "fecha": r.fecha,
                "accion": r.accion,
                "tabla_afectada": r.tabla_afectada,
                "usuario_nombre": nombre_operador
            })

        return lista_auditorias, total

crud_auditoria = CRUDAuditoria(Auditoria)
