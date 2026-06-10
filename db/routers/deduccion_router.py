from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date
import math
from crud.deduccion_crud import crud_deduccion
from crud.nominas_crud import recalculate_nomina_if_pending
from schemas.deduccion_schema import DeduccionCreate, DeduccionResponse, DeduccionUpdate
from models.deduccion_model import Deduccion, DeduccionEmpleado, FormulaCalculo
from models.empleado_model import Empleado
from database import get_db
from utils.auth import get_current_payload, require_permission

router = APIRouter(tags=["Deducciones"], dependencies=[Depends(get_current_payload)])

# Automatic formula assignment based on deduction type
_FORMULA_BY_TYPE = {
    "Ivss": FormulaCalculo.ivss,
    "Lph":  FormulaCalculo.lph,
    "Spf":  FormulaCalculo.spf,
    "Faov": FormulaCalculo.faov,
}

_DEFAULT_DEDUCCIONES = [
    {"nombre": "Ivss",            "formula_calculo": FormulaCalculo.ivss,   "tipo_pago": "mensual",   "monto": 0, "es_porcentaje": False, "descripcion": "Seguro Social Obligatorio (IVSS): aporte de ley del trabajador calculado sobre el salario."},
    {"nombre": "Lph",             "formula_calculo": FormulaCalculo.lph,    "tipo_pago": "mensual",   "monto": 0, "es_porcentaje": False, "descripcion": "Ley de Política Habitacional (FAOV/LPH): aporte de ley del trabajador para el ahorro habitacional."},
    {"nombre": "Spf",             "formula_calculo": FormulaCalculo.spf,    "tipo_pago": "mensual",   "monto": 0, "es_porcentaje": False, "descripcion": "Régimen Prestacional de Empleo (Paro Forzoso): aporte de ley del trabajador ante la cesantía."},
    {"nombre": "Faov",            "formula_calculo": FormulaCalculo.faov,   "tipo_pago": "mensual",   "monto": 0, "es_porcentaje": False, "descripcion": "Fondo de Ahorro Obligatorio para la Vivienda (FAOV): aporte de ley calculado sobre el salario integral."},
    # {"nombre": "horas no laboradas", "monto":0,"tipo_pago":"unico","descripcion":"deduccion por horas no laboradas","formula_calculo":"manual","es_porcentaje":False},
    # {"nombre": "inasistencia", "monto":0,"tipo_pago":"unico","descripcion":"deduccion por inasistencia","formula_calculo":"manual","es_porcentaje":False},
    # {"nombre": "reposo", "monto":0,"tipo_pago":"unico","descripcion":"deduccion por reposo","formula_calculo":"manual","es_porcentaje":False}

]

# Legal deducciones that apply to every employee automatically
_LEGAL_NOMBRES = {"Ivss", "Lph", "Spf", "Faov"}

# Las deducciones de ley (IVSS, LPH, Paro Forzoso/SPF, FAOV) son obligatorias y no
# pueden modificarse ni eliminarse desde la aplicación.
_LEGAL_FORMULAS = {
    FormulaCalculo.ivss,
    FormulaCalculo.lph,
    FormulaCalculo.spf,
    FormulaCalculo.faov,
}


def _es_deduccion_legal(deduccion: Deduccion) -> bool:
    return (
        deduccion.formula_calculo in _LEGAL_FORMULAS
        or str(deduccion.nombre) in _LEGAL_NOMBRES
    )


class PrestamoCreate(BaseModel):
    empleado_cedula: str
    monto_total: float
    descripcion: Optional[str] = None
    fecha: Optional[date] = None


@router.post("/prestamo", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_prestamo(data: PrestamoCreate, db: Session = Depends(get_db)):
    """
    Create a loan (prestamo) deduction for an employee.
    - If monto_total <= 50% salary: 1 installment, applies immediately.
    - If monto_total > 50% salary: split into multiple monthly installments.
    """
    emp = db.query(Empleado).filter_by(cedula=data.empleado_cedula).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado not found")

    salary_limit = float(emp.salario_base) * 0.25
    n_cuotas = 1 if data.monto_total <= salary_limit else math.ceil(data.monto_total / salary_limit)
    cuota_monto = data.monto_total / n_cuotas

    fecha_inicio = data.fecha if data.fecha else date.today()
    fin_total_month = fecha_inicio.month + (n_cuotas - 1)
    fecha_fin = date(
        fecha_inicio.year + (fin_total_month - 1) // 12,
        ((fin_total_month - 1) % 12) + 1,
        30
    )
    print(fecha_fin)

    ded = Deduccion(
        nombre="prestamo",
        tipo_pago="mensual",
        formula_calculo=FormulaCalculo.prestamo,
        monto=data.monto_total,
        es_porcentaje=False,
        descripcion=data.descripcion,
        fecha=fecha_inicio,
        fecha_fin=fecha_fin,
    )
    db.add(ded)
    db.flush()
    db.add(DeduccionEmpleado(deduccion_id=ded.id, empleado_cedula=data.empleado_cedula))
    db.commit()
    db.refresh(ded)

    recalculate_nomina_if_pending(ded.id, is_bono=False, tipo_pago="mensual")

    return {
        "deduccion_id": ded.id,
        "cuotas": n_cuotas,
        "cuota_monto": float(cuota_monto),
        "fecha_fin": str(fecha_fin),
    }


@router.post("/seed-defaults", response_model=List[DeduccionResponse], status_code=status.HTTP_201_CREATED)
def seed_default_deducciones(db: Session = Depends(get_db)):
    """
    Insert the default deduction types if they don't already exist.
    The 4 legal ones (Ivss, Lph, Spf, Faov) are also linked to every active employee
    so they apply automatically when a nomina is created.
    Idempotent — safe to call multiple times.
    """
    from models.empleado_model import Empleado

    created = []
    for defaults in _DEFAULT_DEDUCCIONES:
        exists = db.query(Deduccion).filter(Deduccion.nombre == defaults["nombre"]).first()
        if exists:
            continue
        ded = Deduccion(**defaults)
        db.add(ded)
        db.flush()

        if defaults["nombre"] in _LEGAL_NOMBRES:
            empleados = db.query(Empleado).filter(
                Empleado.estado.in_(["activo", "permiso"])
            ).all()
            for emp in empleados:
                already = db.query(DeduccionEmpleado).filter(
                    DeduccionEmpleado.deduccion_id == ded.id,
                    DeduccionEmpleado.empleado_cedula == emp.cedula,
                ).first()
                if not already:
                    db.add(DeduccionEmpleado(deduccion_id=ded.id, empleado_cedula=emp.cedula))

        created.append(ded)

    db.commit()
    for ded in created:
        db.refresh(ded)
    return created


@router.post("/", response_model=DeduccionResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("nominas:crear"))])
def create_deduccion(deduccion_data: DeduccionCreate, db: Session = Depends(get_db)):
    """Create a deduccion and recalculate any pending nominas for that period."""
    from models.deduccion_model import Deduccion

    lista_empleados = deduccion_data.lista_empleados
    deduccion_dict = deduccion_data.model_dump(exclude={"lista_empleados"})

    # Auto-assign the legal formula if the type has one
    nombre_val = str(deduccion_dict.get("nombre", ""))
    auto_formula = _FORMULA_BY_TYPE.get(nombre_val)
    if auto_formula:
        deduccion_dict["formula_calculo"] = auto_formula

    deduccion = Deduccion(**deduccion_dict)
    db.add(deduccion)
    db.commit()
    db.refresh(deduccion)

    # Create employee relationships
    if lista_empleados:
        for cedula in lista_empleados:
            deduccion_emp = DeduccionEmpleado(empleado_cedula=cedula, deduccion_id=deduccion.id)
            db.add(deduccion_emp)
        db.commit()

    # Recalculate pending nominas
    if deduccion.tipo_pago:
        recalculate_nomina_if_pending(deduccion.id, is_bono=False, tipo_pago=deduccion.tipo_pago)

    return deduccion


@router.get("/", response_model=List[DeduccionResponse])
def read_all_deducciones(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_deduccion.get_all(db, skip=skip, limit=limit)


@router.get("/{deduccion_id}", response_model=DeduccionResponse)
def read_deduccion(deduccion_id: int, db: Session = Depends(get_db)):
    deduccion = crud_deduccion.get(db, id=deduccion_id)
    if not deduccion:
        raise HTTPException(status_code=404, detail="Deduccion not found")
    return deduccion


@router.put("/{deduccion_id}", response_model=DeduccionResponse, dependencies=[Depends(require_permission("nominas:editar"))])
def update_deduccion(deduccion_id: int, deduccion_data: DeduccionUpdate, db: Session = Depends(get_db)):
    deduccion = crud_deduccion.get(db, id=deduccion_id)
    if not deduccion:
        raise HTTPException(status_code=404, detail="Deduccion not found")

    if _es_deduccion_legal(deduccion):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las deducciones de ley (IVSS, LPH, Paro Forzoso, FAOV) no pueden modificarse",
        )

    # If nombre is being updated, re-assign the formula automatically
    if deduccion_data.nombre:
        auto_formula = _FORMULA_BY_TYPE.get(str(deduccion_data.nombre))
        if auto_formula and not deduccion_data.formula_calculo:
            deduccion_data.formula_calculo = auto_formula

    return crud_deduccion.update(db, db_obj=deduccion, obj_in=deduccion_data)


@router.delete("/{deduccion_id}", response_model=DeduccionResponse, dependencies=[Depends(require_permission("nominas:eliminar"))])
def delete_deduccion(deduccion_id: int, db: Session = Depends(get_db)):
    deduccion = crud_deduccion.get(db, id=deduccion_id)
    if not deduccion:
        raise HTTPException(status_code=404, detail="Deduccion not found")

    if _es_deduccion_legal(deduccion):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Las deducciones de ley (IVSS, LPH, Paro Forzoso, FAOV) no pueden eliminarse",
        )

    return crud_deduccion.remove(db, id=deduccion_id)
