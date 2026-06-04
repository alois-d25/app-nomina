from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List

class BonoBase(BaseModel):
    nombre: str
    monto: float
    es_porcentaje: bool
    descripcion: Optional[str] = None
    observacion: Optional[str] = None
    tipo_pago: str # 'unico', 'quincenal', 'mensual'
    fecha: Optional[date] = None
    lista_empleados: Optional[List[str]] = None

class BonoCreate(BonoBase):
    pass

class BonoUpdate(BaseModel):
    nombre: Optional[str] = None
    monto: Optional[float] = None
    es_porcentaje: Optional[bool] = None
    descripcion: Optional[str] = None
    observacion: Optional[str] = None
    tipo_pago: Optional[str] = None
    fecha: Optional[date] = None
    lista_empleados: Optional[List[str]] = None

class BonoResponse(BonoBase):
    id: int
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

class BonoEmpleadoBase(BaseModel):
    empleado_cedula: str
    bono_id: int

class BonoEmpleadoCreate(BonoEmpleadoBase):
    pass

class BonoEmpleadoUpdate(BaseModel):
    pass

class BonoEmpleadoResponse(BonoEmpleadoBase):
    model_config = ConfigDict(from_attributes=True)

class BonoEmpleadoDetalleResponse(BaseModel):
    empleado_cedula: str
    empleado_nombre: str
    bono_id: int
    bono_nombre: str
    monto: float
    tipo_pago: str
    descripcion: Optional[str] = None
    es_porcentaje: bool

    model_config = ConfigDict(from_attributes=True)

class NominaBonoCreate(BaseModel):
    nomina_id: int
    bono_id: int

class NominaBonoResponse(NominaBonoCreate):
    model_config = ConfigDict(from_attributes=True)
class NominaBonoUpdate(BaseModel):
    pass