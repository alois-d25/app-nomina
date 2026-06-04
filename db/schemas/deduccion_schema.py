from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from models.deduccion_model import FormulaCalculo

class DeduccionBase(BaseModel):
    nombre: str
    formula_calculo: FormulaCalculo = FormulaCalculo.manual
    # monto and es_porcentaje only used when formula_calculo = 'manual'
    monto: float = 0
    es_porcentaje: bool = False
    descripcion: Optional[str] = None
    observacion: Optional[str] = None
    tipo_pago: str  # 'unico', 'quincenal', 'mensual'
    fecha: Optional[date] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    lista_empleados: Optional[List[str]] = None

class DeduccionCreate(DeduccionBase):
    pass

class DeduccionUpdate(BaseModel):
    nombre: Optional[str] = None
    formula_calculo: Optional[FormulaCalculo] = None
    monto: Optional[float] = None
    es_porcentaje: Optional[bool] = None
    descripcion: Optional[str] = None
    observacion: Optional[str] = None
    tipo_pago: Optional[str] = None
    fecha: Optional[date] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    lista_empleados: Optional[List[str]] = None

class DeduccionResponse(DeduccionBase):
    id: int
    created_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

class DeduccionEmpleadoBase(BaseModel):
    empleado_cedula: str
    deduccion_id: int

class DeduccionEmpleadoCreate(DeduccionEmpleadoBase):
    pass

class DeduccionEmpleadoUpdate(BaseModel):
    pass

class DeduccionEmpleadoResponse(DeduccionEmpleadoBase):
    model_config = ConfigDict(from_attributes=True)

class DeduccionEmpleadoDetalleResponse(BaseModel):
    empleado_cedula: str
    empleado_nombre: str
    deduccion_id: int
    deduccion_nombre: str
    monto: float
    tipo_pago: str
    descripcion: Optional[str] = None
    es_porcentaje: bool

    model_config = ConfigDict(from_attributes=True)

class NominaDeduccionCreate(BaseModel):
    nomina_id: int
    deduccion_id: int

class NominaDeduccionResponse(NominaDeduccionCreate):
    model_config = ConfigDict(from_attributes=True)

class NominaDeduccionUpdate(BaseModel):
    pass