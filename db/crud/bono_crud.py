from crud.base_crud import CRUDBase
from models.bono_model import Bono, BonoEmpleado
from schemas.bono_schema import (
    BonoCreate, BonoUpdate, 
    BonoEmpleadoCreate, BonoEmpleadoUpdate,
)

crud_bono = CRUDBase[Bono, BonoCreate, BonoUpdate](Bono)
crud_bono_empleado = CRUDBase[BonoEmpleado, BonoEmpleadoCreate, BonoEmpleadoUpdate](BonoEmpleado)
