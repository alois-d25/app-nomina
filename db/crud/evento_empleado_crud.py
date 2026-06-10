import math
from calendar import monthrange
from datetime import date
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from models.evento_empleado_model import EventoEmpleado, TipoEvento
from models.empleado_model import Empleado, EstadoEmpleado
from schemas.evento_empleado_schema import EventoEmpleadoCreate, EventoEmpleadoUpdate


class CRUDEventoEmpleado(CRUDBase[EventoEmpleado, EventoEmpleadoCreate, EventoEmpleadoUpdate]):

    def create(self, db: Session, *, obj_in: EventoEmpleadoCreate) -> EventoEmpleado:
        """
        Crea un evento. Si es tipo 'vacaciones':
        - Verifica que no haya solapamiento con otras vacaciones.
        - Si la fecha de inicio ya llegó (hoy o antes), pasa el estado del empleado a
          'permiso'. Si el inicio es a futuro, el estado se mantiene y se sincronizará
          automáticamente al cargar la lista de empleados el día que inicien.
        """
        if obj_in.tipo_evento == TipoEvento.vacaciones:
            self._validar_solapamiento(db, obj_in.empleado_cedula,
                                       obj_in.fecha_inicio, obj_in.fecha_fin)

        evento = super().create(db, obj_in=obj_in)

        if obj_in.tipo_evento == TipoEvento.vacaciones \
                and obj_in.fecha_inicio and obj_in.fecha_inicio <= date.today():
            empleado = db.query(Empleado).filter_by(cedula=obj_in.empleado_cedula).first()
            if empleado:
                empleado.estado = EstadoEmpleado.permiso
                db.commit()

        return evento

    def remove(self, db: Session, *, id) -> EventoEmpleado:
        """
        Elimina un evento. Si era de tipo 'vacaciones', regresa el estado del empleado
        a 'activo' (la vacación deja de existir).
        """
        obj = db.get(self.model, id)
        es_vacaciones = obj is not None and obj.tipo_evento == TipoEvento.vacaciones
        cedula = obj.empleado_cedula if obj is not None else None

        eliminado = super().remove(db, id=id)

        if es_vacaciones and cedula:
            empleado = db.query(Empleado).filter_by(cedula=cedula).first()
            if empleado:
                empleado.estado = EstadoEmpleado.activo
                db.commit()

        return eliminado

    def _validar_solapamiento(self, db: Session, cedula: str, fecha_inicio: date, fecha_fin: date):
        solapamiento = db.query(EventoEmpleado).filter(
            EventoEmpleado.empleado_cedula == cedula,
            EventoEmpleado.tipo_evento == TipoEvento.vacaciones,
            EventoEmpleado.fecha_inicio <= fecha_fin,
            EventoEmpleado.fecha_fin >= fecha_inicio,
        ).first()
        if solapamiento:
            raise ValueError(
                f"El empleado ya tiene vacaciones registradas que solapan el período "
                f"{fecha_inicio} – {fecha_fin} (evento #{solapamiento.id})."
            )

    def get_vacacion_activa(self, db: Session, cedula: str, fecha: date) -> EventoEmpleado | None:
        """Retorna la vacación activa del empleado en una fecha dada, o None."""
        return db.query(EventoEmpleado).filter(
            EventoEmpleado.empleado_cedula == cedula,
            EventoEmpleado.tipo_evento == TipoEvento.vacaciones,
            EventoEmpleado.fecha_inicio <= fecha,
            EventoEmpleado.fecha_fin >= fecha,
        ).first()

    def get_by_empleado(self, db: Session, cedula: str, skip: int = 0, limit: int = 100):
        return (
            db.query(self.model)
            .filter(self.model.empleado_cedula == cedula)
            .order_by(self.model.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_mensual(self, db: Session, cedula: str, anio: int, mes: int):
        """Eventos del empleado que tocan el mes dado."""
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


def calcular_dias_vacaciones_lottt(anios_servicio: float) -> dict:
    """
    Calcula los días de vacaciones y bono vacacional según LOTTT:
    - Vacaciones: 15 días + 1 por año sucesivo desde el 2do (máx 30).
    - Bono vacacional: igual estructura (máx 30).
    """
    anios_completos = math.floor(anios_servicio)
    dias_adicionales = max(0, anios_completos - 1)
    dias_vacaciones = min(15 + dias_adicionales, 30)
    dias_bono_vac = min(15 + dias_adicionales, 30)
    return {
        "dias_vacaciones": dias_vacaciones,
        "dias_bono_vac": dias_bono_vac,
        "anios_servicio": round(anios_servicio, 2),
    }


crud_evento_empleado = CRUDEventoEmpleado(EventoEmpleado)
