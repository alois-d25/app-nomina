from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import io

from database import get_db
from crud.liquidaciones_crud import (
    crear_liquidacion,
    get_liquidacion,
    get_liquidaciones_all,
    get_liquidaciones_empleado,
    aprobar_liquidacion,
)

router = APIRouter(tags=["Liquidaciones"])


@router.get("/")
def list_liquidaciones(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    estado: str = Query(None, description="Filtrar por estado: borrador, pendiente, aprobada, completada"),
    db: Session = Depends(get_db),
):
    """Listar todas las liquidaciones con paginación y filtro por estado."""
    try:
        liquidaciones = get_liquidaciones_all(db, skip=skip, limit=limit, estado=estado)
        return {"status": "success", "total": len(liquidaciones), "liquidaciones": liquidaciones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar liquidaciones: {str(e)}")


@router.post("/crear/{cedula}")
def create_liquidacion_endpoint(
    cedula: str,
    fecha_egreso: str,
    causa_egreso: str,
    tasa_dolar: float,
    saldo_deudor_prestamos: float = Query(0.0, ge=0),
    tasa_activa_porcentaje: float = Query(0.0, ge=0),
    db: Session = Depends(get_db),
):
    """
    Crea una liquidación con cálculo completo Art. 142 LOTTT.

    - fecha_egreso: YYYY-MM-DD
    - causa_egreso: renuncia | despido | fin_contrato | jubilacion
    - tasa_dolar: tasa de cambio Bs/USD
    - saldo_deudor_prestamos: saldo total de préstamos/anticipos a deducir (Bs)
    - tasa_activa_porcentaje: tasa activa BCV para intereses (ej: 15.5)
    """
    try:
        fecha_obj = datetime.strptime(fecha_egreso, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="fecha_egreso debe estar en formato YYYY-MM-DD")

    try:
        result = crear_liquidacion(
            db,
            cedula,
            fecha_obj,
            causa_egreso,
            tasa_dolar,
            saldo_deudor_prestamos=saldo_deudor_prestamos,
            tasa_activa_porcentaje=tasa_activa_porcentaje,
        )
        return {"status": "success", "message": "Liquidación creada exitosamente", "liquidacion": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear liquidación: {str(e)}")


@router.get("/empleado/{cedula}")
def get_liquidaciones_empleado_endpoint(cedula: str, db: Session = Depends(get_db)):
    """Historial de liquidaciones de un empleado."""
    try:
        liquidaciones = get_liquidaciones_empleado(db, cedula)
        return {"status": "success", "total": len(liquidaciones), "liquidaciones": liquidaciones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener liquidaciones: {str(e)}")


@router.get("/{liquidacion_id}")
def get_liquidacion_detail(liquidacion_id: int, db: Session = Depends(get_db)):
    """Detalle completo de una liquidación con todos los conceptos desglosados."""
    try:
        liquidacion = get_liquidacion(db, liquidacion_id)
        if not liquidacion:
            raise HTTPException(status_code=404, detail=f"Liquidación {liquidacion_id} no encontrada")
        return {"status": "success", "liquidacion": liquidacion}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener liquidación: {str(e)}")


@router.post("/{liquidacion_id}/approve")
def approve_liquidacion(liquidacion_id: int, db: Session = Depends(get_db)):
    """
    Aprueba la liquidación y cambia el estado del empleado a INACTIVO.
    Solo se pueden aprobar liquidaciones en estado Borrador.
    """
    try:
        result = aprobar_liquidacion(db, liquidacion_id)
        return {"status": "success", "message": "Liquidación aprobada. Empleado marcado como inactivo.", "liquidacion": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al aprobar liquidación: {str(e)}")


@router.get("/{liquidacion_id}/recibo")
def download_recibo(liquidacion_id: int, db: Session = Depends(get_db)):
    """Descarga el recibo de liquidación en formato Excel."""
    try:
        from utils.excel_utils import create_liquidacion_excel

        liquidacion = get_liquidacion(db, liquidacion_id)
        if not liquidacion:
            raise HTTPException(status_code=404, detail=f"Liquidación {liquidacion_id} no encontrada")

        excel_bytes = create_liquidacion_excel(liquidacion)
        filename = f"Liquidacion_{liquidacion['empleado_cedula']}_{liquidacion['fecha_egreso']}.xlsx"
        return StreamingResponse(
            io.BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar recibo: {str(e)}")
