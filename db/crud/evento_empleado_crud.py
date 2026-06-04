from calendar import monthrange
from datetime import date
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.evento_empleado_model import EventoEmpleado
from schemas.evento_empleado_schema import EventoEmpleadoCreate, EventoEmpleadoUpdate


class CRUDEventoEmpleado(CRUDBase[EventoEmpleado, EventoEmpleadoCreate, EventoEmpleadoUpdate]):

    def get_by_empleado(self, db: Session, cedula: str, skip: int = 0, limit: int = 100):
        return (
            db.query(self.model)
            .filter(self.model.empleado_cedula == cedula)
            .order_by(self.model.fecha.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_mensual(self, db: Session, cedula: str, anio: int, mes: int):
        """Eventos del empleado que tocan el mes dado.

        - Eventos con `fecha` simple (inasistencia, horas): fecha dentro del mes.
        - Eventos con rango (reposo): el rango fecha_inicio..fecha_fin solapa el mes.
        """
        primer_dia = date(anio, mes, 1)
        ultimo_dia = date(anio, mes, monthrange(anio, mes)[1])

        fecha_en_mes = and_(
            self.model.fecha.isnot(None),
            self.model.fecha >= primer_dia,
            self.model.fecha <= ultimo_dia,
        )
        rango_solapa_mes = and_(
            self.model.fecha_inicio.isnot(None),
            self.model.fecha_fin.isnot(None),
            self.model.fecha_inicio <= ultimo_dia,
            self.model.fecha_fin >= primer_dia,
        )

        return (
            db.query(self.model)
            .filter(self.model.empleado_cedula == cedula)
            .filter(or_(fecha_en_mes, rango_solapa_mes))
            .all()
        )


crud_evento_empleado = CRUDEventoEmpleado(EventoEmpleado)
