from pydantic import BaseModel, ConfigDict
from datetime import date
from models.evento_empleado_model import TipoEvento


class EventoEmpleadoBase(BaseModel):
    tipo_evento: TipoEvento
    empleado_cedula: str
    fecha: date | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    cantidad: int | None = None
    observacion: str | None = None


class EventoEmpleadoCreate(EventoEmpleadoBase):
    pass


class EventoEmpleadoUpdate(BaseModel):
    tipo_evento: TipoEvento | None = None
    empleado_cedula: str | None = None
    fecha: date | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    cantidad: int | None = None
    observacion: str | None = None


class EventoEmpleadoResponse(EventoEmpleadoBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
