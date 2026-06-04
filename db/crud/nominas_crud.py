import json
import os
from typing import Optional, List
from datetime import datetime, date

from fastapi import Depends
from sqlalchemy import extract, or_, func
from sqlalchemy.orm import Session
from crud.base_crud import CRUDBase
from schemas.nominas_schema import NominasCreate, NominasResponse, NominasUpdate
from models.empleado_model import Empleado
from database import SessionLocal, get_db
from models.nominas_model import Nominas
from models.nomina_empleado_model import NominaEmpleado, NominaEmpleadoBono, NominaEmpleadoDeduccion
from models.bono_model import Bono, BonoEmpleado
from models.deduccion_model import Deduccion, DeduccionEmpleado
from models.cestaticket_model import Cestaticket, CestaticketMes
from models.evento_empleado_model import EventoEmpleado, TipoEvento
from models.niveles_escalafon_model import NivelesEscalafon

crud_nominas = CRUDBase[Nominas, NominasCreate, NominasUpdate](Nominas)

_CONSTANTES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "nomina_constantes.json")

def _cargar_constantes() -> dict:
    with open(_CONSTANTES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _calcular_salario_integral(salario_mensual: float) -> float:
    """
    Salario integral =
      salario_mensual + alicuota_utilidades + alicuota_bono_vacacional
    """
    constantes = _cargar_constantes()
    dias_utilidades = constantes["dias_aguinaldo"]
    dias_bono_vacacional = constantes["dias_bono_vacacional"]
    alicuota_util = salario_mensual * dias_utilidades / 360
    alicuota_bono = salario_mensual * dias_bono_vacacional / 360
    return salario_mensual + alicuota_util + alicuota_bono


def _aplicar_formula(formula: str, salario_base: float) -> float:
    if formula == "ivss":
        return salario_base * 12 / 52 * 0.04 * 4
    elif formula == "spf":
        return salario_base * 12 / 52 * 0.005 * 4
    elif formula == "lph":
        return salario_base * 0.01
    elif formula == "faov":
        return _calcular_salario_integral(salario_base) * 0.01
    return 0


def _bono_aplica(bono: Bono, is_q1: bool, year: int, month: int) -> bool:
    if bono.tipo_pago == 'quincenal':
        return True
    if bono.tipo_pago == 'mensual':
        return not is_q1
    if bono.tipo_pago == 'unico' and bono.fecha:
        return (
            bono.fecha.year == year
            and bono.fecha.month == month
            and (bono.fecha.day <= 15) == is_q1
        )
    return False


def _deduccion_aplica(ded: Deduccion, is_q1: bool, year: int, month: int) -> bool:
    nomina_date = date(year, month, 15 if is_q1 else 30)
    if ded.fecha_inicio and nomina_date < ded.fecha_inicio:
        return False
    if ded.fecha_fin and nomina_date > ded.fecha_fin:
        return False
    if ded.tipo_pago == 'quincenal':
        return True
    if ded.tipo_pago == 'mensual':
        return not is_q1
    if ded.tipo_pago == 'unico' and ded.fecha:
        return (
            ded.fecha.year == year
            and ded.fecha.month == month
            and (ded.fecha.day <= 15) == is_q1
        )
    return False


def _contar_inasistencias_mes(session: Session, cedula: str, year: int, month: int) -> int:
    """
    Count total inasistencias for an employee in a given month.
    Returns the sum of all inasistencia quantities for the month.
    """
    result = session.query(func.count(EventoEmpleado.id)).filter(
        EventoEmpleado.empleado_cedula == cedula,
        EventoEmpleado.tipo_evento == TipoEvento.inasistencia,
        EventoEmpleado.fecha.isnot(None),
        extract('year', EventoEmpleado.fecha) == year,
        extract('month', EventoEmpleado.fecha) == month
    ).scalar()
    return int(result or 0)


def _calcular_cestaticket(session: Session, cedula: str, year: int, month: int, salario_base: float):
    constantes = _cargar_constantes()
    monto_cestaticket = float(constantes.get("cestaticket_monto", 0))

    if monto_cestaticket <= 0:
        return None, 0.0

    cestaticket = session.query(Cestaticket).filter_by(empleado_cedula=cedula).first()
    if not cestaticket:
        cestaticket = Cestaticket(empleado_cedula=cedula, monto=monto_cestaticket)
        session.add(cestaticket)
        session.flush()
    else:
        cestaticket.monto = monto_cestaticket

    total_inasistencias = _contar_inasistencias_mes(session, cedula, year, month)
    if total_inasistencias <= 10:
        monto_final = monto_cestaticket
    else:
        excess = total_inasistencias - 10
        reduction_percentage = min(excess / 30, 1.0)
        monto_final = monto_cestaticket * (1 - reduction_percentage)

    return cestaticket.id, monto_final


def _crear_deducciones_eventos(session: Session, nomina_id: int, year: int, month: int, is_q1: bool):
    """
    After nomina is calculated, create deduccion records for event deductions.
    These are audit trail records to document what was deducted (tipo_pago="unico").
    Does NOT affect salary calculation (already handled by descuento_eventos).
    """
    from calendar import monthrange

    if is_q1:
        q_start = date(year, month, 1)
        q_end = date(year, month, 15)
    else:
        q_start = date(year, month, 16)
        q_end = date(year, month, monthrange(year, month)[1])

    nomina_empleados = session.query(NominaEmpleado).filter(
        NominaEmpleado.nomina_id == nomina_id
    ).all()

    for ne in nomina_empleados:
        cedula = ne.empleado_cedula
        #salario mensual
        salario_quincena = float(ne.salario_base) / 2

        # Get empleado to calculate valor_dia for event deductions
        empleado = session.query(Empleado).filter_by(cedula=cedula).first()
        if not empleado:
            continue

        nivel = session.query(NivelesEscalafon).filter_by(id=empleado.nivel_escalafon_id).first()
        es_por_hora = bool(nivel and nivel.es_por_hora)
        dias_semana = empleado.dias_trabajados_semana or 0
        horas_semana = empleado.horas_trabajadas_semana or 0
        valor_dia = (salario_quincena / (dias_semana * 2)) if dias_semana else 0.0
        valor_hora = (salario_quincena / (horas_semana * 2)) if horas_semana else 0.0

        # Get all eventos for this employee in this period
        eventos = session.query(EventoEmpleado).filter(
            EventoEmpleado.empleado_cedula == cedula
        ).all()

        for ev in eventos:
            tipo = ev.tipo_evento.value if hasattr(ev.tipo_evento, 'value') else str(ev.tipo_evento)
            monto_deducido = 0.0

            if tipo == 'horas no laboradas' and ev.fecha and q_start <= ev.fecha <= q_end:
                monto_deducido = valor_hora * (ev.cantidad or 0)
            elif not es_por_hora:
                if tipo == 'inasistencia' and ev.fecha and q_start <= ev.fecha <= q_end:
                    monto_deducido = valor_dia * (ev.cantidad or 1)
                elif tipo == 'reposo' and ev.fecha_inicio and ev.fecha_fin and ev.fecha_inicio <= q_end and ev.fecha_fin >= q_start:
                    total_dias = (ev.fecha_fin - ev.fecha_inicio).days
                    print(total_dias)
                    if total_dias > 3:
                        if total_dias > 15:
                            monto_deducido = salario_quincena * 0.3334
                        else:
                            ini = max(ev.fecha_inicio, q_start)
                            fin = min(ev.fecha_fin, q_end)
                            dias_en_q = (fin - ini).days + 1
                            monto_deducido = valor_dia * dias_en_q

            if monto_deducido > 0:
                ded = session.query(Deduccion).filter(Deduccion.nombre == tipo).first()
                if not ded:
                    continue


                ned = session.query(NominaEmpleadoDeduccion).filter(
                    NominaEmpleadoDeduccion.nomina_id == nomina_id,
                    NominaEmpleadoDeduccion.empleado_cedula == cedula,
                    NominaEmpleadoDeduccion.deduccion_id == ded.id,
                ).first()
                if ned:
                    ned.monto_aplicado = monto_deducido
                else:
                    session.add(NominaEmpleadoDeduccion(
                        nomina_id=nomina_id,
                        empleado_cedula=cedula,
                        deduccion_id=ded.id,
                        monto_aplicado=monto_deducido,
                    ))

                    session.commit()


def get_detalle_empleado_nomina(nomina_id: int, cedula: str, db: Session):
    from models.bono_model import Bono
    from models.deduccion_model import Deduccion

    ne = (
        db.query(NominaEmpleado)
        .filter(NominaEmpleado.nomina_id == nomina_id, NominaEmpleado.empleado_cedula == cedula)
        .first()
    )
    nomina = db.query(Nominas).filter(Nominas.id == nomina_id).first()

    bonos = (
        db.query(NominaEmpleadoBono, Bono)
        .join(Bono, NominaEmpleadoBono.bono_id == Bono.id)
        .filter(NominaEmpleadoBono.nomina_id == nomina_id, NominaEmpleadoBono.empleado_cedula == cedula)
        .all()
    )

    deducciones = (
        db.query(NominaEmpleadoDeduccion, Deduccion)
        .join(Deduccion, NominaEmpleadoDeduccion.deduccion_id == Deduccion.id)
        .filter(NominaEmpleadoDeduccion.nomina_id == nomina_id, NominaEmpleadoDeduccion.empleado_cedula == cedula)
        .all()
    )

    return {
        "nomina_id": nomina_id,
        "fecha_pago": str(nomina.fecha_pago) if nomina else None,
        "tasa_dolar": float(nomina.tasa_dolar) if nomina else None,
        "empleado_cedula": cedula,
        "salario_base": float(ne.salario_base or 0) if ne else 0,
        "total_ingresos": float(ne.total_ingresos or 0) if ne else 0,
        "total_deducciones": float(ne.total_deducciones or 0) if ne else 0,
        "cestaticket_aplicado": float(ne.cestaticket_aplicado or 0) if ne else 0,
        "salario_final_bs": float(ne.salario_final_bs or 0) if ne else 0,
        "salario_final_usd": float(ne.salario_final_usd or 0) if ne else 0,
        "bonos": [
            {
                "bono_id": b.id,
                "nombre": b.nombre,
                "descripcion": b.descripcion,
                "es_porcentaje": b.es_porcentaje,
                "monto_base": float(b.monto),
                "monto_aplicado": float(nb.monto_aplicado),
                "tipo_pago": b.tipo_pago,
            }
            for nb, b in bonos
        ],
        "deducciones": [
            {
                "deduccion_id": d.id,
                "nombre": d.nombre,
                "descripcion": d.descripcion,
                "formula_calculo": str(d.formula_calculo) if d.formula_calculo else "manual",
                "es_porcentaje": d.es_porcentaje,
                "monto_base": float(d.monto),
                "monto_aplicado": float(nd.monto_aplicado),
                "tipo_pago": d.tipo_pago,
            }
            for nd, d in deducciones
        ],
    }


def get_historial_nomina_empleado(cedula: str, db: Session, limit: int = 10):
    rows = (
        db.query(NominaEmpleado, Nominas)
        .join(Nominas, NominaEmpleado.nomina_id == Nominas.id)
        .filter(NominaEmpleado.empleado_cedula == cedula)
        .order_by(Nominas.fecha_pago.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "nomina_id": ne.nomina_id,
            "fecha_pago": str(nom.fecha_pago),
            "salario_base": float(ne.salario_base or 0),
            "total_ingresos": float(ne.total_ingresos or 0),
            "total_deducciones": float(ne.total_deducciones or 0),
            "salario_final_bs": float(ne.salario_final_bs or 0),
            "salario_final_usd": float(ne.salario_final_usd or 0),
        }
        for ne, nom in rows
    ]


def get_nomina_by_period(mes: int, anio: int, quincena: int, db: Session = Depends(get_db)):
    query = db.query(Nominas).filter(
        extract('year', Nominas.fecha_pago) == anio,
        extract('month', Nominas.fecha_pago) == mes
    )

    if quincena == 1:
        query = query.filter(extract('day', Nominas.fecha_pago) <= 15)
    elif quincena == 2:
        query = query.filter(extract('day', Nominas.fecha_pago) > 15)

    return query.first()


def get_nomina_detalle_empleados(id: int, db: Session, skip: int = 0, limit: int = 10):
    nomina = db.query(Nominas).filter(Nominas.id == id).first()
    # is_q2 = nomina and nomina.fecha_pago.day > 15
    # year = nomina.fecha_pago.year if nomina else None
    # month = nomina.fecha_pago.month if nomina else None

    query = db.query(NominaEmpleado, Empleado).join(
        Empleado, NominaEmpleado.empleado_cedula == Empleado.cedula
    ).filter(NominaEmpleado.nomina_id == id)

    total = query.count()
    empleados_nomina = query.offset(skip).limit(limit).all()

    items = []
    for emp_nom, emp in empleados_nomina:
        items.append({
            "empleado_cedula": emp_nom.empleado_cedula,
            "nombre": f"{emp.nombre} {emp.apellido}",
            "salario_base": emp_nom.salario_base,
            "total_ingresos": emp_nom.total_ingresos,
            "total_deducciones": emp_nom.total_deducciones,
            "salario_final_bs": emp_nom.salario_final_bs,
            "cestaticket_aplicado": float(emp_nom.cestaticket_aplicado or 0),
        })

    return {"items": items, "total": total}


def get_dashboard_resumen(db: Session):
    """Agrega toda la información que muestra el dashboard en una sola consulta."""
    from models.tasa_dolar_model import TasaDolar

    # --- Tarjetas: conteos de empleados ---
    total_empleados = db.query(Empleado).count()
    empleados_activos = db.query(Empleado).filter(Empleado.estado == 'activo').count()

    # --- Tarjeta: tasa de cambio más reciente ---
    tasa = db.query(TasaDolar).order_by(TasaDolar.fecha.desc(), TasaDolar.id.desc()).first()
    tasa_actual = float(tasa.valor) if tasa else None
    tasa_tipo = tasa.tipo.value if tasa else None

    # --- Tabla: últimas 6 nóminas con su monto total (salario + bonos, sin deducciones) ---
    nominas = db.query(Nominas).order_by(Nominas.fecha_pago.desc(), Nominas.id.desc()).limit(6).all()
    ultimas_nominas = []
    for n in nominas:
        agg = db.query(
            func.coalesce(func.sum(NominaEmpleado.total_ingresos), 0),
            func.count(NominaEmpleado.empleado_cedula)
        ).filter(NominaEmpleado.nomina_id == n.id).first()
        monto_total_bs = float(agg[0]) if agg else 0
        tasa_n = float(n.tasa_dolar) if n.tasa_dolar else None
        ultimas_nominas.append({
            "id": n.id,
            "fecha_pago": n.fecha_pago.isoformat(),
            "monto_total_bs": monto_total_bs,
            "monto_total_usd": (monto_total_bs / tasa_n) if tasa_n else None,
            "tasa_dolar": tasa_n,
            "total_empleados": int(agg[1]) if agg else 0,
        })

    # --- Gráfica: gasto total pagado (salario + bonos, en USD) agrupado por mes ---
    # Las deducciones no se restan porque ese dinero lo retiene la empresa.
    chart_map = {}
    todas_nominas = db.query(Nominas).filter(Nominas.tasa_dolar.isnot(None)).all()
    for n in todas_nominas:
        tasa_n = float(n.tasa_dolar)
        if tasa_n == 0:
            continue
        total_bs = db.query(func.coalesce(func.sum(NominaEmpleado.total_ingresos), 0)).filter(
            NominaEmpleado.nomina_id == n.id
        ).scalar()
        usd = float(total_bs) / tasa_n
        key = n.fecha_pago.strftime('%Y-%m')
        chart_map[key] = chart_map.get(key, 0) + usd

    grafica_gastos = [
        {"mes": k, "total_usd": round(v, 2)}
        for k, v in sorted(chart_map.items())
    ]

    # --- Tarjeta: gasto del mes más reciente (en Bs) ---
    gastos_mensuales_bs = 0
    if ultimas_nominas:
        mes_reciente = ultimas_nominas[0]["fecha_pago"][:7]  # 'YYYY-MM'
        gastos_mensuales_bs = sum(
            un["monto_total_bs"] for un in ultimas_nominas if un["fecha_pago"][:7] == mes_reciente
        )

    return {
        "total_empleados": total_empleados,
        "empleados_activos": empleados_activos,
        "gastos_mensuales_bs": gastos_mensuales_bs,
        "tasa_actual": tasa_actual,
        "tasa_tipo": tasa_tipo,
        "ultimas_nominas": ultimas_nominas,
        "grafica_gastos": grafica_gastos,
    }


def get_nominas_historial(db: Session):
    """Lista TODAS las nóminas con sus totales agregados (Bs, USD, nº empleados)."""
    nominas = db.query(Nominas).order_by(Nominas.fecha_pago.desc(), Nominas.id.desc()).all()

    historial = []
    for n in nominas:
        agg = db.query(
            func.coalesce(func.sum(NominaEmpleado.total_ingresos), 0),
            func.count(NominaEmpleado.empleado_cedula)
        ).filter(NominaEmpleado.nomina_id == n.id).first()
        monto_total_bs = float(agg[0]) if agg else 0
        tasa_n = float(n.tasa_dolar) if n.tasa_dolar else None
        historial.append({
            "id": n.id,
            "fecha_pago": n.fecha_pago.isoformat(),
            "monto_total_bs": monto_total_bs,
            "monto_total_usd": (monto_total_bs / tasa_n) if tasa_n else None,
            "tasa_dolar": tasa_n,
            "total_empleados": int(agg[1]) if agg else 0,
        })

    return historial


def _calcular_descuento_eventos(session, cedula: str, salario_base: float,
                                is_q1: bool, year: int, month: int):
    """Descuento por eventos del empleado (inasistencia, horas no laboradas, reposo)
    que caen en la quincena indicada.

    - salario_base es MENSUAL -> salario de la quincena = salario_base / 2.
    - valor_dia  = salario_quincena / (dias_trabajados_semana * 2)
    - valor_hora = salario_quincena / (horas_trabajadas_semana * 2)
    - Niveles "por hora": solo se descuentan las 'horas no laboradas'.
    - Resto de niveles: inasistencias (días) y reposo.
        * reposo <= 3 días: sin descuento.
        * reposo 4-15 días: se descuentan los días del reposo que caen en la quincena.
        * reposo > 15 días: se descuenta el 33.34% del salario de la quincena.
    """
    from calendar import monthrange
    from models.evento_empleado_model import EventoEmpleado
    from models.niveles_escalafon_model import NivelesEscalafon

    salario_quincena = float(salario_base or 0) / 2
    if salario_quincena <= 0:
        return 0.0

    if is_q1:
        q_start, q_end = date(year, month, 1), date(year, month, 15)
    else:
        q_start, q_end = date(year, month, 16), date(year, month, monthrange(year, month)[1])

    empleado = session.query(Empleado).filter_by(cedula=cedula).first()
    if not empleado:
        return 0.0
    nivel = session.query(NivelesEscalafon).filter_by(id=empleado.nivel_escalafon_id).first()
    es_por_hora = bool(nivel and nivel.es_por_hora)

    dias_semana = empleado.dias_trabajados_semana or 0
    horas_semana = empleado.horas_trabajadas_semana or 0
    valor_dia = (salario_quincena / (dias_semana * 2)) if dias_semana else 0.0
    valor_hora = (salario_quincena / (horas_semana * 2)) if horas_semana else 0.0

    eventos = session.query(EventoEmpleado).filter(
        EventoEmpleado.empleado_cedula == cedula
    ).all()

    descuento = 0.0
    for ev in eventos:
        tipo = ev.tipo_evento.value if hasattr(ev.tipo_evento, 'value') else str(ev.tipo_evento)

        if tipo == 'horas no laboradas' and ev.fecha and q_start <= ev.fecha <= q_end:
            descuento += valor_hora * (ev.cantidad or 0)
        elif not es_por_hora:
            if tipo == 'inasistencia' and ev.fecha and q_start <= ev.fecha <= q_end:
                descuento += valor_dia * (ev.cantidad or 1)
            elif (tipo == 'reposo' and ev.fecha_inicio and ev.fecha_fin
                  and ev.fecha_inicio <= q_end and ev.fecha_fin >= q_start):
                total_dias = (ev.fecha_fin - ev.fecha_inicio).days + 1
                if total_dias <= 3:
                    continue
                if total_dias > 15:
                    descuento += salario_quincena * 0.3334
                else:
                    ini = max(ev.fecha_inicio, q_start)
                    fin = min(ev.fecha_fin, q_end)
                    dias_en_q = (fin - ini).days + 1
                    descuento += valor_dia * dias_en_q
        

    return descuento


def _calcular_totales(session, nomina_id: int, cedula: str, salario_base: float,
                      is_q1: bool, year: int, month: int):
    """
    Query bonos/deducciones assigned to this employee, filter by period,
    compute each amount, write snapshot rows, and return totals.
    """
    # ── Bonos ────────────────────────────────────────────────────────────────
    bonos = session.query(Bono).join(
        BonoEmpleado, BonoEmpleado.bono_id == Bono.id
    ).filter(BonoEmpleado.empleado_cedula == cedula).all()

    total_bonos = 0.0
    for bono in bonos:
        if not _bono_aplica(bono, is_q1, year, month):
            continue
        monto = salario_base * float(bono.monto) / 100 if bono.es_porcentaje else float(bono.monto)
        total_bonos += monto
        session.add(NominaEmpleadoBono(
            nomina_id=nomina_id,
            empleado_cedula=cedula,
            bono_id=bono.id,
            monto_aplicado=monto,
        ))

    # ── Deducciones ───────────────────────────────────────────────────────────
    deducciones = session.query(Deduccion).join(
        DeduccionEmpleado, DeduccionEmpleado.deduccion_id == Deduccion.id
    ).filter(DeduccionEmpleado.empleado_cedula == cedula).all()

    total_deducciones = 0.0
    for ded in deducciones:
        if not _deduccion_aplica(ded, is_q1, year, month):
            continue
        formula = ded.formula_calculo if ded.formula_calculo else "manual"
        if formula != "manual":
            monto = _aplicar_formula(formula, salario_base)
        elif ded.es_porcentaje:
            monto = salario_base * float(ded.monto) / 100
        else:
            monto = float(ded.monto)
        total_deducciones += monto
        session.add(NominaEmpleadoDeduccion(
            nomina_id=nomina_id,
            empleado_cedula=cedula,
            deduccion_id=ded.id,
            monto_aplicado=monto,
        ))

    # ── Descuento por eventos del empleado (inasistencias, horas, reposo) ──────
    total_deducciones += _calcular_descuento_eventos(
        session, cedula, salario_base, is_q1, year, month
    )

    # ── Cestaticket (solo en 2da quincena) ────────────────────────────────────
    cestaticket_monto = 0.0
    if not is_q1:
        cestaticket_id, cestaticket_monto = _calcular_cestaticket(session, cedula, year, month, salario_base)
        if cestaticket_id is not None:
            fecha_mes = date(year, month, 1)
            reporte = session.query(CestaticketMes).filter_by(
                cestaticket_id=cestaticket_id, fecha=fecha_mes
            ).first()
            if reporte:
                reporte.monto_final = cestaticket_monto
            else:
                session.add(CestaticketMes(
                    cestaticket_id=cestaticket_id,
                    fecha=fecha_mes,
                    monto_final=cestaticket_monto,
                ))

    return total_bonos, total_deducciones, cestaticket_monto


def _rebuild_nomina_snapshots(session: Session, nomina_id: int, tasa_dolar: float,
                              year: int, month: int, is_q1: bool):
    session.query(NominaEmpleadoBono).filter(NominaEmpleadoBono.nomina_id == nomina_id).delete()
    session.query(NominaEmpleadoDeduccion).filter(NominaEmpleadoDeduccion.nomina_id == nomina_id).delete()

    for ne in session.query(NominaEmpleado).filter(NominaEmpleado.nomina_id == nomina_id).all():
        empleado = session.query(Empleado).filter_by(cedula=ne.empleado_cedula).first()
        salario_mensual_usd = float(empleado.salario_base) if empleado else float(ne.salario_base) * 2
        salario_quincena_usd = salario_mensual_usd / 2
        total_bonos, total_deducciones, cestaticket_monto = _calcular_totales(
            session, nomina_id, ne.empleado_cedula, salario_mensual_usd, is_q1, year, month
        )
        total_ingresos = salario_quincena_usd + total_bonos
        salario_final_usd = total_ingresos - total_deducciones
        ne.salario_base = salario_quincena_usd
        ne.total_ingresos = total_ingresos
        ne.total_deducciones = total_deducciones
        ne.cestaticket_aplicado = cestaticket_monto
        ne.salario_final_usd = salario_final_usd
        ne.salario_final_bs = salario_final_usd * tasa_dolar

    session.commit()
    _crear_deducciones_eventos(session, nomina_id, year, month, is_q1)


def create_nomina_with_employees_info(fecha_pago: str, tasa_pago: float):
    session = SessionLocal()
    try:
        nomina = Nominas(fecha_pago=fecha_pago, tasa_dolar=tasa_pago)
        session.add(nomina)
        session.commit()
        session.refresh(nomina)

        fecha_obj = datetime.strptime(fecha_pago, '%Y-%m-%d') if isinstance(fecha_pago, str) else fecha_pago
        year, month, day = fecha_obj.year, fecha_obj.month, fecha_obj.day
        is_first_period = day <= 15

        empleados = session.query(Empleado).filter(
            or_(Empleado.estado == 'activo', Empleado.estado == 'permiso')
        ).all()

        session.add_all([
            NominaEmpleado(
                nomina_id=nomina.id,
                empleado_cedula=emp.cedula,
                salario_base=float(emp.salario_base),
            )
            for emp in empleados
        ])
        session.commit()

        _rebuild_nomina_snapshots(session, nomina.id, float(tasa_pago), year, month, is_first_period)

        return session.query(NominaEmpleado).filter(NominaEmpleado.nomina_id == nomina.id).all()
    finally:
        session.close()


def update_payroll_employee_info(nomina_id: int):
    session = SessionLocal()
    try:
        nomina = session.query(Nominas).filter(Nominas.id == nomina_id).first()
        if not nomina:
            return {"status": "error", "message": f"Nomina {nomina_id} not found"}

        fecha = nomina.fecha_pago
        _rebuild_nomina_snapshots(
            session, nomina_id, float(nomina.tasa_dolar),
            fecha.year, fecha.month, fecha.day <= 15,
        )

        return {"status": "success", "message": f"Nomina {nomina_id} recalculada correctamente."}
    finally:
        session.close()


def recalculate_nomina_if_pending(bono_or_deduccion_id: int, is_bono: bool, tipo_pago: str):
    """
    After a bono or deduccion is created/updated, recalculate any non-approved nominas
    where it would apply. No pre-linking needed — _calcular_totales queries
    live from BonoEmpleado/DeduccionEmpleado each time.
    """
    session = SessionLocal()
    try:
        today = date.today()

        if is_bono:
            item = session.query(Bono).filter(Bono.id == bono_or_deduccion_id).first()
        else:
            item = session.query(Deduccion).filter(Deduccion.id == bono_or_deduccion_id).first()
        if not item:
            return None

        if tipo_pago == 'unico' and item.fecha:
            year, month, day = item.fecha.year, item.fecha.month, item.fecha.day
            is_q1 = day <= 15
            query = session.query(Nominas).filter(
                extract('year', Nominas.fecha_pago) == year,
                extract('month', Nominas.fecha_pago) == month,
                Nominas.aprobada == False,
            )
            query = query.filter(
                extract('day', Nominas.fecha_pago) <= 15 if is_q1
                else extract('day', Nominas.fecha_pago) > 15
            )
            nominas = [n for n in query.all() if n.fecha_pago >= today]

        elif tipo_pago == 'quincenal':
            nominas = session.query(Nominas).filter(
                Nominas.fecha_pago >= today,
                Nominas.aprobada == False,
            ).all()

        elif tipo_pago == 'mensual':
            nominas = session.query(Nominas).filter(
                Nominas.fecha_pago >= today,
                extract('day', Nominas.fecha_pago) > 15,
                Nominas.aprobada == False,
            ).all()
        else:
            nominas = []

        session.close()
        for nomina in nominas:
            update_payroll_employee_info(nomina.id)
            session = SessionLocal()

        return None
    finally:
        session.close()
