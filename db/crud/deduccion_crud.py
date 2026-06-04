from crud.base_crud import CRUDBase
from models.deduccion_model import Deduccion, DeduccionEmpleado
from schemas.deduccion_schema import (
    DeduccionCreate, DeduccionUpdate,
    DeduccionEmpleadoCreate, DeduccionEmpleadoUpdate,
)

crud_deduccion = CRUDBase[Deduccion, DeduccionCreate, DeduccionUpdate](Deduccion)
crud_deduccion_empleado = CRUDBase[DeduccionEmpleado, DeduccionEmpleadoCreate, DeduccionEmpleadoUpdate](DeduccionEmpleado)
