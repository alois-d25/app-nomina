from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal
from crud.base_crud import CRUDBase
from models.liquidacion_model import Liquidacion, EstadoLiquidacion
from models.empleado_model import Empleado
from schemas.liquidacion_schema import LiquidacionCreate, LiquidacionUpdate


class CRUDLiquidacion(CRUDBase[Liquidacion, LiquidacionCreate, LiquidacionUpdate]):
    def get_by_empleado(self, db: Session, empleado_cedula: str):
        """Get liquidacion for an employee"""
        return db.query(self.model).filter(
            self.model.empleado_cedula == empleado_cedula
        ).first()

    def calculate_years(self, fecha_ingreso: date, fecha_egreso: date) -> int:
        """Calculate years of service"""
        delta = fecha_egreso - fecha_ingreso
        return delta.days // 365

    def approve_liquidacion(self, db: Session, liquidacion_id: int):
        """Approve liquidacion and mark employee as inactive"""
        liquidacion = db.query(self.model).filter(self.model.id == liquidacion_id).first()
        if not liquidacion:
            return None

        # Update liquidacion status
        liquidacion.estado = EstadoLiquidacion.Aprobada

        # Update employee status to inactivo
        empleado = db.query(Empleado).filter(
            Empleado.cedula == liquidacion.empleado_cedula
        ).first()
        if empleado:
            from models.empleado_model import EstadoEmpleado
            empleado.estado = EstadoEmpleado.inactivo

        db.commit()
        db.refresh(liquidacion)
        return liquidacion


crud_liquidacion = CRUDLiquidacion(Liquidacion)
