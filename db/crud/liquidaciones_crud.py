import json
import math
from decimal import Decimal
from datetime import date
from pathlib import Path
from sqlalchemy.orm import Session

from models.empleado_model import Empleado
from models.liquidaciones_model import Liquidaciones, EstadoLiquidacion, CausaEgreso
from models.liquidaciones_prestaciones_model import LiquidacionesPrestaciones
from crud.nominas_crud import _calcular_salario_integral

_CONSTANTES_PATH = Path(__file__).parent.parent / "nomina_constantes.json"

def _load_constantes() -> dict:
    with open(_CONSTANTES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Helpers de fecha
# ---------------------------------------------------------------------------

def _ultimo_aniversario(fecha_ingreso: date, fecha_egreso: date) -> date:
    """Último aniversario laboral anterior o igual a fecha_egreso."""
    try:
        aniversario = date(fecha_egreso.year, fecha_ingreso.month, fecha_ingreso.day)
    except ValueError:
        # Ej: ingreso 29-feb en año bisiesto; usar último día del mes
        import calendar
        ultimo_dia = calendar.monthrange(fecha_egreso.year, fecha_ingreso.month)[1]
        aniversario = date(fecha_egreso.year, fecha_ingreso.month, ultimo_dia)

    if aniversario > fecha_egreso:
        try:
            aniversario = date(fecha_egreso.year - 1, fecha_ingreso.month, fecha_ingreso.day)
        except ValueError:
            import calendar
            ultimo_dia = calendar.monthrange(fecha_egreso.year - 1, fecha_ingreso.month)[1]
            aniversario = date(fecha_egreso.year - 1, fecha_ingreso.month, ultimo_dia)

    return aniversario


def _anios_servicio(fecha_ingreso: date, fecha_egreso: date) -> float:
    return (fecha_egreso - fecha_ingreso).days / 365.0


# ---------------------------------------------------------------------------
# Cálculos Art. 142 LOTTT
# ---------------------------------------------------------------------------

def _calcular_escenario_a(anios_decimal: float, sid: float) -> dict:
    """
    Escenario A: depósitos trimestrales (15 días c/trimestre) +
    días adicionales desde el 2do año (2 días/año, tope 30 acumulados).
    """
    trimestres_completos = math.floor(anios_decimal * 4)
    dias_depositos = trimestres_completos * 15
    monto_depositos = dias_depositos * sid

    anios_completos = math.floor(anios_decimal)
    anios_desde_2do = max(0, anios_completos - 1)
    dias_adicionales = min(anios_desde_2do * 2, 30)
    monto_adicionales = dias_adicionales * sid

    total = monto_depositos + monto_adicionales
    return {
        "total": total,
        "dias_depositos": dias_depositos,
        "monto_depositos": monto_depositos,
        "dias_adicionales": dias_adicionales,
        "monto_adicionales": monto_adicionales,
    }


def _calcular_escenario_b(anios_decimal: float, sid: float) -> float:
    """
    Escenario B: SID × 30 días × años (fracción >6 meses = año completo).
    """
    fraccion = anios_decimal - math.floor(anios_decimal)
    anios_b = math.ceil(anios_decimal) if fraccion > 0.5 else math.floor(anios_decimal)
    return sid * 30 * anios_b


# ---------------------------------------------------------------------------
# Conceptos fraccionados
# ---------------------------------------------------------------------------

def _calcular_vacaciones_fraccionadas(
    fecha_ingreso: date, fecha_egreso: date, dias_vac: int, sid: float
) -> dict:
    """Vacaciones proporcionales desde el último aniversario hasta el egreso."""
    aniversario = _ultimo_aniversario(fecha_ingreso, fecha_egreso)
    meses = (fecha_egreso - aniversario).days / 30.0
    dias = (meses / 12.0) * dias_vac
    return {"dias": dias, "monto": dias * sid}


def _calcular_bono_vacacional_fraccionado(
    fecha_ingreso: date, fecha_egreso: date, dias_bono_vac: int, sdb: float
) -> dict:
    """Bono vacacional proporcional desde el último aniversario. Usa salario diario básico."""
    aniversario = _ultimo_aniversario(fecha_ingreso, fecha_egreso)
    meses = (fecha_egreso - aniversario).days / 30.0
    dias = (meses / 12.0) * dias_bono_vac
    return {"dias": dias, "monto": dias * sdb}


def _calcular_utilidades_fraccionadas(fecha_egreso: date, dias_aguinaldo: int, sdb: float) -> dict:
    """Utilidades proporcionales a los meses trabajados en el año fiscal (enero–diciembre)."""
    meses_en_año = fecha_egreso.month
    dias = (meses_en_año / 12.0) * dias_aguinaldo
    return {"dias": dias, "monto": dias * sdb}


def _calcular_salarios_pendientes(fecha_egreso: date, salario_base: float) -> dict:
    """Días trabajados en la quincena actual no pagados aún."""
    salario_diario = salario_base / 30.0
    dia = fecha_egreso.day
    dias_pendientes = dia if dia <= 15 else (dia - 15)
    return {"dias": float(dias_pendientes), "monto": dias_pendientes * salario_diario}


def _calcular_intereses(escenario_a_bs: float, tasa_activa_porcentaje: float) -> float:
    """Intereses sobre el fondo acumulado (Escenario A) usando la tasa activa BCV."""
    return escenario_a_bs * (tasa_activa_porcentaje / 100.0)


# ---------------------------------------------------------------------------
# CRUD principal
# ---------------------------------------------------------------------------

def crear_liquidacion(
    session: Session,
    empleado_cedula: str,
    fecha_egreso: date,
    causa_egreso: str,
    tasa_dolar: float,
    saldo_deudor_prestamos: float = 0.0,
    tasa_activa_porcentaje: float = 0.0,
) -> dict:
    """
    Crea una liquidación con cálculo completo Art. 142 LOTTT.
    Devuelve un dict con todos los conceptos desglosados.
    """
    empleado = session.query(Empleado).filter_by(cedula=empleado_cedula).first()
    if not empleado:
        raise ValueError(f"Empleado {empleado_cedula} no encontrado")

    constantes = _load_constantes()
    dias_aguinaldo = constantes.get("dias_aguinaldo", 15)
    dias_bono_vac = constantes.get("dias_bono_vacacional", 15)
    dias_vac_contractuales = constantes.get("dias_vacaciones_contractuales", 15)

    salario_base = float(empleado.salario_base)
    anios_decimal = _anios_servicio(empleado.fecha_ingreso, fecha_egreso)
    if anios_decimal < 0:
        raise ValueError("La fecha de egreso no puede ser anterior a la fecha de ingreso")

    # Salario integral mensual y diario
    salario_integral_mensual = _calcular_salario_integral(salario_base)
    sid = salario_integral_mensual / 30.0   # Salario Integral Diario
    sdb = salario_base / 30.0               # Salario Diario Básico

    # --- Art. 142 LOTTT ---
    esc_a = _calcular_escenario_a(anios_decimal, sid)
    esc_b = _calcular_escenario_b(anios_decimal, sid)
    escenario_a_bs = esc_a["total"]
    escenario_b_bs = esc_b

    if escenario_a_bs >= escenario_b_bs:
        prestaciones_bs = escenario_a_bs
        escenario_aplicado = "A"
    else:
        prestaciones_bs = escenario_b_bs
        escenario_aplicado = "B"

    # --- Conceptos fraccionados ---
    vac = _calcular_vacaciones_fraccionadas(empleado.fecha_ingreso, fecha_egreso, dias_vac_contractuales, sid)
    bono_vac = _calcular_bono_vacacional_fraccionado(empleado.fecha_ingreso, fecha_egreso, dias_bono_vac, sdb)
    util = _calcular_utilidades_fraccionadas(fecha_egreso, dias_aguinaldo, sdb)
    sal_pend = _calcular_salarios_pendientes(fecha_egreso, salario_base)
    intereses = _calcular_intereses(escenario_a_bs, tasa_activa_porcentaje)

    # --- Totales ---
    monto_total_bs = (
        prestaciones_bs
        + vac["monto"]
        + bono_vac["monto"]
        + util["monto"]
        + sal_pend["monto"]
        + intereses
    )
    monto_neto_bs = max(0.0, monto_total_bs - saldo_deudor_prestamos)
    monto_total_usd = monto_total_bs / tasa_dolar if tasa_dolar else 0.0
    monto_neto_usd = monto_neto_bs / tasa_dolar if tasa_dolar else 0.0

    # --- Persistir liquidación ---
    causa_enum = _parse_causa_egreso(causa_egreso)
    liquidacion = Liquidaciones(
        empleado_cedula=empleado_cedula,
        fecha_egreso=fecha_egreso,
        anios_totales=round(anios_decimal, 2),
        tasa_dolar=tasa_dolar,
        estado=EstadoLiquidacion.borrador,
        causa_egreso=causa_enum,
        salario_integral_dia=round(sid, 4),
        escenario_aplicado=escenario_aplicado,
        escenario_a_bs=round(escenario_a_bs, 2),
        escenario_b_bs=round(escenario_b_bs, 2),
        prestaciones_bs=round(prestaciones_bs, 2),
        vacaciones_fracc_bs=round(vac["monto"], 2),
        bono_vac_fracc_bs=round(bono_vac["monto"], 2),
        utilidades_fracc_bs=round(util["monto"], 2),
        salarios_pendientes_bs=round(sal_pend["monto"], 2),
        intereses_bs=round(intereses, 2),
        saldo_deudor_bs=round(saldo_deudor_prestamos, 2),
        monto_total_bs=round(monto_total_bs, 2),
        monto_total_usd=round(monto_total_usd, 2),
        monto_neto_bs=round(monto_neto_bs, 2),
        monto_neto_usd=round(monto_neto_usd, 2),
    )
    session.add(liquidacion)
    session.flush()

    # --- Persistir desglose en liquidaciones_prestaciones ---
    lineas = [
        {
            "concepto": "prestaciones_sociales",
            "dias": (esc_a["dias_depositos"] + esc_a["dias_adicionales"]) if escenario_aplicado == "A" else round(anios_decimal) * 30,
            "monto_bs": round(prestaciones_bs, 2),
            "es_deduccion": 0,
            "observacion": f"Art.142 Escenario {escenario_aplicado} (A: Bs.{escenario_a_bs:.2f} / B: Bs.{escenario_b_bs:.2f})",
        },
        {
            "concepto": "vacaciones_fraccionadas",
            "dias": round(vac["dias"], 4),
            "monto_bs": round(vac["monto"], 2),
            "es_deduccion": 0,
            "observacion": f"{dias_vac_contractuales} días contractuales × proporción aniversario",
        },
        {
            "concepto": "bono_vac_fraccionado",
            "dias": round(bono_vac["dias"], 4),
            "monto_bs": round(bono_vac["monto"], 2),
            "es_deduccion": 0,
            "observacion": f"{dias_bono_vac} días bono vacacional × proporción aniversario",
        },
        {
            "concepto": "utilidades_fraccionadas",
            "dias": round(util["dias"], 4),
            "monto_bs": round(util["monto"], 2),
            "es_deduccion": 0,
            "observacion": f"{fecha_egreso.month} meses en el año fiscal / 12 × {dias_aguinaldo} días",
        },
        {
            "concepto": "salarios_pendientes",
            "dias": sal_pend["dias"],
            "monto_bs": round(sal_pend["monto"], 2),
            "es_deduccion": 0,
            "observacion": f"{int(sal_pend['dias'])} días pendientes de la quincena actual",
        },
        {
            "concepto": "intereses",
            "dias": None,
            "monto_bs": round(intereses, 2),
            "es_deduccion": 0,
            "observacion": f"Intereses sobre Escenario A al {tasa_activa_porcentaje}% anual",
        },
        {
            "concepto": "saldo_deudor",
            "dias": None,
            "monto_bs": round(saldo_deudor_prestamos, 2),
            "es_deduccion": 1,
            "observacion": "Saldo deudor de préstamos y anticipos",
        },
    ]

    for linea in lineas:
        lp = LiquidacionesPrestaciones(
            liquidacion_id=liquidacion.id,
            prestacion_id=None,
            concepto=linea["concepto"],
            cantidad_dias=linea["dias"],
            salario_integral_dia=round(sid, 4),
            monto_total_bs=linea["monto_bs"],
            monto_total_usd=round(linea["monto_bs"] / tasa_dolar, 2) if tasa_dolar else 0.0,
            es_deduccion=linea["es_deduccion"],
            observacion=linea["observacion"],
        )
        session.add(lp)

    session.commit()

    return _liquidacion_to_dict(session, liquidacion, esc_a)


def _parse_causa_egreso(causa_egreso: str) -> CausaEgreso:
    mapping = {
        "renuncia": CausaEgreso.renuncia,
        "despido": CausaEgreso.despido,
        "fin_contrato": CausaEgreso.fin_contrato,
        "fin de contrato": CausaEgreso.fin_contrato,
        "jubilacion": CausaEgreso.jubilacion,
        "jubilación": CausaEgreso.jubilacion,
    }
    return mapping.get(causa_egreso.lower(), CausaEgreso.renuncia)


def get_liquidacion(session: Session, liquidacion_id: int) -> dict | None:
    liquidacion = session.query(Liquidaciones).filter_by(id=liquidacion_id).first()
    if not liquidacion:
        return None

    esc_a_simulado = {
        "dias_depositos": 0,
        "monto_depositos": 0,
        "dias_adicionales": 0,
        "monto_adicionales": 0,
    }
    return _liquidacion_to_dict(session, liquidacion, esc_a_simulado)


def _liquidacion_to_dict(session: Session, liquidacion: Liquidaciones, esc_a: dict) -> dict:
    lineas = session.query(LiquidacionesPrestaciones).filter_by(
        liquidacion_id=liquidacion.id
    ).all()

    empleado = session.query(Empleado).filter_by(cedula=liquidacion.empleado_cedula).first()

    return {
        "liquidacion_id": liquidacion.id,
        "empleado_cedula": liquidacion.empleado_cedula,
        "empleado_nombre": f"{empleado.nombre} {empleado.apellido}" if empleado else None,
        "empleado_salario_base": float(empleado.salario_base) if empleado else None,
        "fecha_egreso": str(liquidacion.fecha_egreso),
        "anios_totales": float(liquidacion.anios_totales),
        "tasa_dolar": float(liquidacion.tasa_dolar),
        "estado": liquidacion.estado.value,
        "causa_egreso": liquidacion.causa_egreso.value,
        "observacion": liquidacion.observacion,
        # Datos base
        "salario_integral_dia": float(liquidacion.salario_integral_dia) if liquidacion.salario_integral_dia else None,
        "escenario_aplicado": liquidacion.escenario_aplicado,
        "escenario_a_bs": float(liquidacion.escenario_a_bs) if liquidacion.escenario_a_bs is not None else None,
        "escenario_b_bs": float(liquidacion.escenario_b_bs) if liquidacion.escenario_b_bs is not None else None,
        "prestaciones_bs": float(liquidacion.prestaciones_bs) if liquidacion.prestaciones_bs is not None else None,
        # Conceptos fraccionados
        "vacaciones_fracc_bs": float(liquidacion.vacaciones_fracc_bs) if liquidacion.vacaciones_fracc_bs is not None else None,
        "bono_vac_fracc_bs": float(liquidacion.bono_vac_fracc_bs) if liquidacion.bono_vac_fracc_bs is not None else None,
        "utilidades_fracc_bs": float(liquidacion.utilidades_fracc_bs) if liquidacion.utilidades_fracc_bs is not None else None,
        "salarios_pendientes_bs": float(liquidacion.salarios_pendientes_bs) if liquidacion.salarios_pendientes_bs is not None else None,
        "intereses_bs": float(liquidacion.intereses_bs) if liquidacion.intereses_bs is not None else None,
        # Deducciones y totales
        "saldo_deudor_bs": float(liquidacion.saldo_deudor_bs) if liquidacion.saldo_deudor_bs is not None else 0.0,
        "monto_total_bs": float(liquidacion.monto_total_bs),
        "monto_total_usd": float(liquidacion.monto_total_usd),
        "monto_neto_bs": float(liquidacion.monto_neto_bs) if liquidacion.monto_neto_bs is not None else None,
        "monto_neto_usd": float(liquidacion.monto_neto_usd) if liquidacion.monto_neto_usd is not None else None,
        # Desglose línea a línea
        "desglose": [
            {
                "concepto": lp.concepto,
                "cantidad_dias": float(lp.cantidad_dias) if lp.cantidad_dias is not None else None,
                "salario_integral_dia": float(lp.salario_integral_dia) if lp.salario_integral_dia is not None else None,
                "monto_total_bs": float(lp.monto_total_bs),
                "monto_total_usd": float(lp.monto_total_usd),
                "es_deduccion": bool(lp.es_deduccion),
                "observacion": lp.observacion,
            }
            for lp in lineas
        ],
    }


def get_liquidaciones_all(session: Session, skip: int = 0, limit: int = 50, estado: str = None) -> list:
    """Listar todas las liquidaciones con filtro opcional por estado."""
    query = session.query(Liquidaciones)
    if estado:
        try:
            estado_enum = EstadoLiquidacion[estado.lower()]
            query = query.filter(Liquidaciones.estado == estado_enum)
        except KeyError:
            pass
    liquidaciones = query.order_by(Liquidaciones.id.desc()).offset(skip).limit(limit).all()
    return [_liquidacion_to_dict(session, liq, {}) for liq in liquidaciones]


def get_liquidaciones_empleado(session: Session, cedula: str) -> list:
    liquidaciones = session.query(Liquidaciones).filter_by(empleado_cedula=cedula).all()
    return [_liquidacion_to_dict(session, liq, {}) for liq in liquidaciones]


def aprobar_liquidacion(session: Session, liquidacion_id: int) -> dict:
    """
    Aprueba la liquidación y marca al empleado como inactivo.
    """
    liquidacion = session.query(Liquidaciones).filter_by(id=liquidacion_id).first()
    if not liquidacion:
        raise ValueError(f"Liquidación {liquidacion_id} no encontrada")

    if liquidacion.estado != EstadoLiquidacion.borrador:
        raise ValueError(f"Solo se pueden aprobar liquidaciones en estado Borrador (actual: {liquidacion.estado.value})")

    liquidacion.estado = EstadoLiquidacion.aprobada

    empleado = session.query(Empleado).filter_by(cedula=liquidacion.empleado_cedula).first()
    if empleado:
        from models.empleado_model import EstadoEmpleado
        empleado.estado = EstadoEmpleado.inactivo

    session.commit()
    return _liquidacion_to_dict(session, liquidacion, {})
