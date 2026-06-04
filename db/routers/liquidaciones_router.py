from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi.encoders import jsonable_encoder

from database import get_db
from crud.liquidaciones_crud import crear_liquidacion, get_liquidacion, get_liquidaciones_empleado

router = APIRouter(prefix="/liquidaciones", tags=["Liquidaciones"])


@router.post("/crear/{cedula}")
def create_liquidacion_endpoint(
    cedula: str,
    fecha_egreso: str,  # Format: YYYY-MM-DD
    causa_egreso: str,  # One of: renuncia, despido, fin_contrato, jubilacion
    tasa_dolar: float,
    db: Session = Depends(get_db)
):
    """
    Create a liquidación (severance package) for an employee.
    Calculates all prestaciones based on years of service and salary.

    Args:
        cedula: Employee ID
        fecha_egreso: Employee exit date (YYYY-MM-DD)
        causa_egreso: Reason for leaving (renuncia, despido, fin_contrato, jubilacion)
        tasa_dolar: Exchange rate for USD conversion
    """
    try:
        # Validate and parse fecha_egreso
        try:
            fecha_obj = datetime.strptime(fecha_egreso, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="fecha_egreso debe estar en formato YYYY-MM-DD"
            )

        result = crear_liquidacion(db, cedula, fecha_obj, causa_egreso, tasa_dolar)
        return {
            "status": "success",
            "message": "Liquidación creada exitosamente",
            "liquidacion": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear liquidación: {str(e)}"
        )


@router.get("/{liquidacion_id}")
def get_liquidacion_detail(
    liquidacion_id: int,
    db: Session = Depends(get_db)
):
    """
    Get details of a specific liquidación including all prestaciones breakdown.
    """
    try:
        liquidacion = get_liquidacion(db, liquidacion_id)
        if not liquidacion:
            raise HTTPException(
                status_code=404,
                detail=f"Liquidación {liquidacion_id} no encontrada"
            )
        return {
            "status": "success",
            "liquidacion": liquidacion
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener liquidación: {str(e)}"
        )


@router.get("/empleado/{cedula}")
def get_liquidaciones_empleado_endpoint(
    cedula: str,
    db: Session = Depends(get_db)
):
    """
    Get all liquidaciones for an employee.
    """
    try:
        liquidaciones = get_liquidaciones_empleado(db, cedula)
        return {
            "status": "success",
            "total": len(liquidaciones),
            "liquidaciones": liquidaciones
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener liquidaciones: {str(e)}"
        )
