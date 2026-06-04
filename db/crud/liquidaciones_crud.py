from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session

from models.empleado_model import Empleado
from models.liquidaciones_model import Liquidaciones, EstadoLiquidacion, CausaEgreso
from models.liquidaciones_prestaciones_model import LiquidacionesPrestaciones
from models.prestaciones_model import Prestaciones
from crud.nominas_crud import _calcular_salario_integral
from database import SessionLocal


def _calcular_anios_servicio(fecha_ingreso: date, fecha_egreso: date) -> Decimal:
    """Calculate years of service with decimals."""
    days = (fecha_egreso - fecha_ingreso).days
    return Decimal(days) / Decimal(365)


def _calcular_salario_integral_diario(salario_base: float) -> float:
    """Calculate daily integral salary."""
    integral = _calcular_salario_integral(salario_base)
    return integral / 30


def _calcular_prestacion_garantia(anios_servicio: Decimal, salario_integral_dia: float) -> tuple:
    """
    Accrued guarantee fund: every 3 months = 15 days of integral
    Total = (anios / 0.25) * 15 * daily_integral
    Returns (cantidad_dias, monto_bs)
    """
    trimestres = anios_servicio / Decimal('0.25')
    cantidad_dias = float(trimestres) * 15
    monto_bs = cantidad_dias * salario_integral_dia
    return (cantidad_dias, monto_bs)


def _calcular_prestacion_antiguedad(anios_servicio: Decimal, salario_integral_dia: float) -> tuple:
    """
    2 additional days per year of service
    Returns (cantidad_dias, monto_bs)
    """
    cantidad_dias = float(anios_servicio) * 2
    monto_bs = cantidad_dias * salario_integral_dia
    return (cantidad_dias, monto_bs)


def _calcular_prestacion_vacaciones(anios_servicio: Decimal, salario_integral_dia: float) -> tuple:
    """
    15 base + 1 per year, max 40 days
    Returns (cantidad_dias, monto_bs)
    """
    cantidad_dias = 15 + float(anios_servicio)
    cantidad_dias = min(cantidad_dias, 40)
    monto_bs = cantidad_dias * salario_integral_dia
    return (cantidad_dias, monto_bs)


def _calcular_prestacion_liquidacion(anios_servicio: Decimal, salario_integral_dia: float,
                                    garantia_monto: float) -> tuple:
    """
    30 days per year OR accumulated guarantee fund, whichever is greater
    Returns (cantidad_dias, monto_bs)
    """
    cantidad_dias_por_anio = float(anios_servicio) * 30
    monto_por_anio = cantidad_dias_por_anio * salario_integral_dia

    # Take the greater of the two amounts
    if monto_por_anio >= garantia_monto:
        return (cantidad_dias_por_anio, monto_por_anio)
    else:
        # If guarantee is greater, reverse-calculate the days
        cantidad_dias_garantia = garantia_monto / salario_integral_dia
        return (cantidad_dias_garantia, garantia_monto)


def crear_liquidacion(session: Session, empleado_cedula: str, fecha_egreso: date,
                     causa_egreso: str, tasa_dolar: float) -> dict:
    """
    Create liquidación with all prestaciones snapshot.

    Returns dict with:
    - liquidacion_id
    - monto_total_bs
    - monto_total_usd
    - prestaciones_breakdown (list of prestaciones applied)
    """
    # 1. Get empleado
    empleado = session.query(Empleado).filter_by(cedula=empleado_cedula).first()
    if not empleado:
        raise ValueError(f"Empleado {empleado_cedula} no encontrado")

    # 2. Calculate years of service
    anios_servicio = _calcular_anios_servicio(empleado.fecha_ingreso, fecha_egreso)
    if anios_servicio < 0:
        raise ValueError(f"Fecha de egreso no puede ser anterior a fecha de ingreso")

    # 3. Calculate daily integral salary
    salario_base = float(empleado.salario_base)
    salario_integral_dia = _calcular_salario_integral_diario(salario_base)

    # 4. Calculate each prestación
    prestaciones_breakdown = []

    # Garantía
    dias_garantia, monto_garantia = _calcular_prestacion_garantia(anios_servicio, salario_integral_dia)
    prestaciones_breakdown.append({
        'tipo': 'garantia',
        'dias': dias_garantia,
        'monto_bs': monto_garantia
    })

    # Antigüedad
    dias_antiguedad, monto_antiguedad = _calcular_prestacion_antiguedad(anios_servicio, salario_integral_dia)
    prestaciones_breakdown.append({
        'tipo': 'antiguedad',
        'dias': dias_antiguedad,
        'monto_bs': monto_antiguedad
    })

    # Vacaciones
    dias_vacaciones, monto_vacaciones = _calcular_prestacion_vacaciones(anios_servicio, salario_integral_dia)
    prestaciones_breakdown.append({
        'tipo': 'vacaciones',
        'dias': dias_vacaciones,
        'monto_bs': monto_vacaciones
    })

    # Liquidación (al egreso)
    dias_liquidacion, monto_liquidacion = _calcular_prestacion_liquidacion(
        anios_servicio, salario_integral_dia, monto_garantia
    )
    prestaciones_breakdown.append({
        'tipo': 'liquidacion',
        'dias': dias_liquidacion,
        'monto_bs': monto_liquidacion
    })

    # 5. Calculate total
    monto_total_bs = sum(p['monto_bs'] for p in prestaciones_breakdown)
    monto_total_usd = monto_total_bs / tasa_dolar

    # 6. Create Liquidaciones record
    liquidacion = Liquidaciones(
        empleado_cedula=empleado_cedula,
        fecha_egreso=fecha_egreso,
        anios_totales=float(anios_servicio),
        monto_total_bs=monto_total_bs,
        monto_total_usd=monto_total_usd,
        tasa_dolar=tasa_dolar,
        estado=EstadoLiquidacion.borrador,
        causa_egreso=CausaEgreso[causa_egreso.lower()] if hasattr(CausaEgreso, causa_egreso.lower()) else CausaEgreso.renuncia,
    )
    session.add(liquidacion)
    session.flush()  # Get the ID

    # 7. Create LiquidacionesPrestaciones snapshots
    for breakdown in prestaciones_breakdown:
        tipo = breakdown['tipo']
        dias = breakdown['dias']
        monto_bs = breakdown['monto_bs']
        monto_usd = monto_bs / tasa_dolar

        # Get prestacion record
        prestacion = session.query(Prestaciones).filter(
            Prestaciones.tipo.like(f'%{tipo}%')
        ).first()

        prestacion_id = prestacion.id if prestacion else None

        lp = LiquidacionesPrestaciones(
            liquidacion_id=liquidacion.id,
            prestacion_id=prestacion_id,
            cantidad_dias=dias,
            salario_integral_dia=salario_integral_dia,
            monto_total_bs=monto_bs,
            monto_total_usd=monto_usd,
            observacion=f"Prestación de {tipo.replace('_', ' ')}"
        )
        session.add(lp)

    session.commit()

    return {
        'liquidacion_id': liquidacion.id,
        'empleado_cedula': empleado_cedula,
        'fecha_egreso': str(fecha_egreso),
        'anios_totales': float(anios_servicio),
        'monto_total_bs': monto_total_bs,
        'monto_total_usd': monto_total_usd,
        'tasa_dolar': tasa_dolar,
        'prestaciones': prestaciones_breakdown
    }


def get_liquidacion(session: Session, liquidacion_id: int) -> dict:
    """Get liquidación details with prestaciones breakdown."""
    liquidacion = session.query(Liquidaciones).filter_by(id=liquidacion_id).first()
    if not liquidacion:
        return None

    prestaciones_breakdown = session.query(LiquidacionesPrestaciones).filter_by(
        liquidacion_id=liquidacion_id
    ).all()

    return {
        'liquidacion_id': liquidacion.id,
        'empleado_cedula': liquidacion.empleado_cedula,
        'fecha_egreso': str(liquidacion.fecha_egreso),
        'anios_totales': float(liquidacion.anios_totales),
        'monto_total_bs': float(liquidacion.monto_total_bs),
        'monto_total_usd': float(liquidacion.monto_total_usd),
        'tasa_dolar': float(liquidacion.tasa_dolar),
        'estado': str(liquidacion.estado.value),
        'causa_egreso': str(liquidacion.causa_egreso.value),
        'prestaciones': [
            {
                'prestacion_id': lp.prestacion_id,
                'cantidad_dias': float(lp.cantidad_dias),
                'salario_integral_dia': float(lp.salario_integral_dia),
                'monto_total_bs': float(lp.monto_total_bs),
                'monto_total_usd': float(lp.monto_total_usd),
                'observacion': lp.observacion
            }
            for lp in prestaciones_breakdown
        ]
    }


def get_liquidaciones_empleado(session: Session, cedula: str) -> list:
    """Get all liquidaciones for an employee."""
    liquidaciones = session.query(Liquidaciones).filter_by(empleado_cedula=cedula).all()
    return [get_liquidacion(session, l.id) for l in liquidaciones]
