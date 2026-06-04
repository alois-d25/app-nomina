from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from crud import nominas_crud
from schemas.nominas_schema import NominasCreate, NominasResponse, NominasUpdate
from database import get_db
from utils.auth import get_current_payload, require_permission
from routers.factory import create_crud_router
router = create_crud_router(
    schema_create=NominasCreate,
    schema_update=NominasUpdate,
    schema_response=NominasResponse,
    crud_service=nominas_crud.crud_nominas,
    id_name="id",
    tags=["Nominas"],
    permissions={"create": "nominas:crear", "update": "nominas:editar", "delete": "nominas:eliminar"},
)
from utils.excel_utils import create_payslip_excel, create_payroll_report_excel
from models.nominas_model import Nominas

router = APIRouter(tags=["Nominas"])

@router.get("/dashboard/resumen", tags=["Nominas"], dependencies=[Depends(get_current_payload)])
def get_dashboard_resumen(db: Session = Depends(get_db)):
    """Resumen agregado para el dashboard: conteos, tasa, últimas nóminas y gráfica de gastos."""
    return nominas_crud.get_dashboard_resumen(db)


@router.get("/historial/completo", tags=["Nominas"], dependencies=[Depends(get_current_payload)])
def get_nominas_historial(db: Session = Depends(get_db)):
    """Historial completo de nóminas con totales (Bs, USD, nº empleados y tasa usada)."""
    return nominas_crud.get_nominas_historial(db)


@router.get("/buscar/periodo", response_model=NominasResponse, tags=["Nominas"], dependencies=[Depends(get_current_payload)])
def get_nomina_by_period(mes: int, anio: int, quincena: int, db: Session = Depends(get_db)):
    """
    Busca una nómina basándose en el mes, año y quincena, extrayendo los datos
    directamente del campo 'fecha_pago' del modelo.
    - quincena: 1 (días 1-15), 2 (días 16 en adelante).
    """
    nomina = nominas_crud.get_nomina_by_period(mes, anio, quincena, db)


    if not nomina:
        return JSONResponse(
            status_code=200,
            content={"nomina": None, "message": "there is no nomina for this period"}
        )

    return JSONResponse(
        status_code=200,
        content={"nomina": jsonable_encoder(nomina), "message": "nomina found"}
    )


@router.get("/{id}/detalle-empleados", tags=["Nominas"], dependencies=[Depends(get_current_payload)])
def get_nomina_detalle_empleados(
    id: int, 
    skip: int = 0, 
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """
    Obtiene el desglose de salario base, bonos y deducciones para cada empleado
    dentro de una nómina específica.
    """
    return nominas_crud.get_nomina_detalle_empleados(id, db, skip=skip, limit=limit)


@router.post("/crear", tags=["Nominas"], dependencies=[Depends(require_permission("nominas:crear"))])
def create_nomina(fecha_pago: str = Body(...), tasa_pago: float = Body(...)):
    """
    Crea una nómina para un período específico con todos los empleados.
    - fecha_pago: formato 'YYYY-MM-DD'
    - tasa_pago: tasa de dolar para conversión
    """
    try:
        result = nominas_crud.create_nomina_with_employees_info(fecha_pago, tasa_pago)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear nómina: {str(e)}")
    return {"status": "success", "message": "Nómina creada exitosamente", "nomina_empleados": result}


@router.get("/{nomina_id}/empleado/{cedula}/detalle", tags=["Nominas"])
def get_detalle_empleado_nomina(nomina_id: int, cedula: str, db: Session = Depends(get_db)):
    """Bonos y deducciones aplicados a un empleado en una nómina específica."""
    try:
        detalle = nominas_crud.get_detalle_empleado_nomina(nomina_id, cedula, db)
        if not detalle or not detalle.get("empleado_cedula"):
            raise HTTPException(
                status_code=404,
                detail=f"No se encontró información para el empleado {cedula} en la nómina {nomina_id}"
            )
        return detalle
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener detalles de la nómina: {str(e)}"
        )


@router.get("/empleado/{cedula}/historial", tags=["Nominas"])
def get_historial_nomina_empleado(cedula: str, limit: int = 10, db: Session = Depends(get_db)):
    """Devuelve las últimas N nóminas en las que participó el empleado."""
    return nominas_crud.get_historial_nomina_empleado(cedula, db, limit=limit)


@router.post("/{nomina_id}/recalcular", tags=["Nominas"])
def recalculate_payroll(nomina_id: int, db: Session = Depends(get_db)):
    nomina = db.query(Nominas).filter(Nominas.id == nomina_id).first()
    if not nomina:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    if nomina.aprobada:
        raise HTTPException(
            status_code=400,
            detail="No se puede recalcular una nómina que ha sido aprobada"
        )
    return nominas_crud.update_payroll_employee_info(nomina_id)


@router.post("/{nomina_id}/aprobar", tags=["Nominas"])
def aprobar_nomina(nomina_id: int, db: Session = Depends(get_db)):
    """Marca una nómina como aprobada (la hace inmutable)."""
    nomina = db.query(Nominas).filter(Nominas.id == nomina_id).first()
    if not nomina:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")
    nomina.aprobada = True
    db.commit()
    db.refresh(nomina)
    return {"status": "success", "message": "Nómina aprobada exitosamente", "nomina": jsonable_encoder(nomina)}


@router.get("/{nomina_id}/empleado/{cedula}/payslip", tags=["Nominas"])
def descargar_payslip(nomina_id: int, cedula: str, db: Session = Depends(get_db)):
    """Descarga un recibo de pago en Excel para un empleado en una nómina."""
    detalle = nominas_crud.get_detalle_empleado_nomina(nomina_id, cedula, db)
    if not detalle or not detalle.get('empleado_cedula'):
        raise HTTPException(status_code=404, detail="Empleado o nómina no encontrados")

    from models.empleado_model import Empleado
    emp = db.query(Empleado).filter_by(cedula=cedula).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    excel_file = create_payslip_excel(
        f"{emp.nombre} {emp.apellido}",
        cedula,
        detalle['fecha_pago'],
        detalle
    )

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Recibo_{cedula}_{detalle['fecha_pago']}.xlsx"}
    )


@router.get("/{nomina_id}/reporte", tags=["Nominas"])
def descargar_reporte_nomina(nomina_id: int, db: Session = Depends(get_db)):
    """Descarga el reporte de nómina en Excel."""
    nomina = db.query(Nominas).filter(Nominas.id == nomina_id).first()
    if not nomina:
        raise HTTPException(status_code=404, detail="Nómina no encontrada")

    detalle = nominas_crud.get_nomina_detalle_empleados(nomina_id, db, skip=0, limit=10000)
    if not detalle or not detalle.get('items'):
        raise HTTPException(status_code=404, detail="No hay empleados en esta nómina")

    excel_file = create_payroll_report_excel(
        nomina_id,
        detalle['items'],
        str(nomina.fecha_pago),
        float(nomina.tasa_dolar)
    )

    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Nomina_{nomina.fecha_pago}.xlsx"}
    )
