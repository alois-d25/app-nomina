# Flujo de Cálculo de Nóminas - Detalle Técnico

## 📌 Introducción

Este documento explica paso a paso cómo el sistema calcula las nóminas considerando:
- Salario base y bonos
- Deducciones (impuestos, préstamos, etc.)
- Eventos de empleados (inasistencias, vacaciones, reposos, horas no laboradas)
- Estados especiales de empleados (vacaciones)

---

## 🔑 Conceptos Clave

### Períodos de Pago (Quincenas)
- **Q1 (Primera quincena)**: Días 1-15 del mes
- **Q2 (Segunda quincena)**: Días 16-último día del mes
- Cada período genera una nómina independiente

### Salarios
- **Salario Mensual**: El salario base del empleado (en USD)
- **Salario Quincena**: `salario_mensual / 2` (USD)
- **Salario Final Bs**: Convertido a bolívares usando tasa_dolar

### Fórmula General de Cálculo
```
Total Ingresos = Salario Quincena + Bonos
Total Deducciones = Deducciones Normales + Descuentos por Eventos
Salario Final (USD) = Total Ingresos - Total Deducciones
Salario Final (Bs) = Salario Final (USD) × Tasa de Cambio
```

---

## 🔄 Flujo Principal: `_rebuild_nomina_snapshots()`

Este es el corazón del cálculo. Se ejecuta cada vez que se crea o recalcula una nómina.

### Paso 1: Determinar Período
```python
if es_quincena_1:  # día <= 15
    q_start = 1 de mes
    q_end = 15 de mes
else:
    q_start = 16 de mes
    q_end = último día del mes
```

### Paso 2: Borrar Snapshots Anteriores
Se eliminan `NominaEmpleadoBono` y `NominaEmpleadoDeduccion` para recalcular desde cero.

### Paso 3: Iterar por Cada Empleado
Para cada empleado en la nómina:

#### 3.1 Determinar Estado Vacacional
Función: `_get_estado_vacacion_empleado()`

**Busca si hay evento de vacaciones que se cruce con el período:**
- **"activo"**: Sin vacaciones en el período → Pago normal
- **"inicio"**: Vacaciones inician en este período → Pago proporcional
- **"en_curso"**: Vacaciones cubren todo el período → Sin salario base
- **"reintegro"**: Vacaciones terminan en este período → Pago proporcional

#### 3.2 Calcular Salario Base Según Estado

**A) Estado ACTIVO**
```
Salario Quincena = Salario Mensual / 2
```

**B) Estado INICIO (inicia vacaciones)**
```
Días trabajados = _dias_trabajados_en_quincena(q_start, q_end, vac_start, vac_end)
Salario Quincena = (Salario Mensual / 30) × Días Trabajados

ADEMÁS: Se añaden bonos vacacionales del evento:
- Salario de Vacaciones (USD)
- Bono Vacacional (USD)
```

**C) Estado EN CURSO (durante vacaciones)**
```
Salario Quincena = 0
Total Bonos = 0
Total Deducciones = 0 (excepto cestaticket si es Q2)
```

**D) Estado REINTEGRO (vuelve de vacaciones)**
```
Días trabajados = _dias_trabajados_en_quincena(q_start, q_end, vac_start, vac_end)
Salario Quincena = (Salario Mensual / 30) × Días Trabajados
Estado del empleado = "activo"  # Se reactiva automáticamente
```

### Paso 4: Calcular Bonos, Deducciones y Cestaticket

Función: `_calcular_totales()` + `_calcular_descuento_eventos()` + `_calcular_cestaticket()`

---

## 💰 Cálculo de BONOS

### Función: `_bono_aplica(bono, is_q1, year, month)`

**Lógica de Aplicación:**

```python
if bono.tipo_pago == 'quincenal':
    # SIEMPRE aplica (Q1 y Q2)
    return True

elif bono.tipo_pago == 'mensual':
    # Solo aplica en Q2 (segunda quincena del mes)
    return is_q2

elif bono.tipo_pago == 'unico':
    # Solo si la fecha del bono cae en este período
    # Y en la quincena correcta
    if bono.fecha.year == year and bono.fecha.month == month:
        is_bono_q1 = bono.fecha.day <= 15
        return is_bono_q1 == is_q1_actual
    return False
```

### Cálculo del Monto

Una vez que se determina que un bono aplica:

```python
if bono.es_porcentaje:
    monto = salario_mensual * bono.monto / 100
else:
    monto = bono.monto  # Monto fijo

# Se registra en NominaEmpleadoBono
NominaEmpleadoBono(
    nomina_id=nomina_id,
    empleado_cedula=cedula,
    bono_id=bono.id,
    monto_aplicado=monto
)

total_bonos += monto
```

### Ejemplos

| Bono | Tipo | Aplica Q1 | Aplica Q2 | Descripción |
|------|------|-----------|-----------|-------------|
| Bono Desempeño | Quincenal | ✓ | ✓ | Siempre se paga |
| Prima Anual | Mensual | ✗ | ✓ | Solo 2da quincena |
| Bonus 15 Junio | Único | ✓/✗ | ✗ | Solo 15 de junio Q1 |
| Bonus 25 Dic | Único | ✗ | ✓ | Solo 25 de dic Q2 |

---

## 📉 Cálculo de DEDUCCIONES

### Función: `_deduccion_aplica(deduccion, is_q1, year, month)`

**Lógica Similar a Bonos:**

```python
if deduccion.tipo_pago == 'quincenal':
    return True

elif deduccion.tipo_pago == 'mensual':
    # Caso especial: Préstamos
    if deduccion.nombre == 'prestamo':
        # Solo aplica en Q2
        # Y solo si la fecha de inicio del préstamo es anterior a la nómina
        return not is_q1 and deduccion.fecha <= nomina_date
    else:
        return not is_q1

elif deduccion.tipo_pago == 'unico':
    if deduccion.fecha.year == year and deduccion.fecha.month == month:
        is_ded_q1 = deduccion.fecha.day <= 15
        return is_ded_q1 == is_q1_actual
    return False
```

### Cálculo del Monto por Fórmula

#### A) Deducciones Manuales
```python
if deduccion.es_porcentaje:
    monto = salario_base * deduccion.monto / 100
else:
    monto = deduccion.monto  # Fijo
```

#### B) Deducciones con Fórmulas Especiales

**IVSS (Instituto Venezolano de Seguros Sociales)**
```
monto = salario_base * (12/52) * 0.04 * 4
# Aproximadamente 3.7% del salario
```

**SPF (Seguro de Paro Forzoso)**
```
monto = salario_base * (12/52) * 0.005 * 4
# Aproximadamente 0.46% del salario
```

**LPH (Ley de Política Habitacional)**
```
monto = salario_base * 0.01
# 1% del salario
```

**FAOV (Fondo de Ahorro Obligatorio Voluntario)**
```
salario_integral = salario_base + (salario_base * días_utilidades/360) 
                  + (salario_base * días_bono_vac/360)
monto = salario_integral * 0.01
# 1% del salario integral
```

#### C) Deducciones por Préstamo

**Lógica Especial:**
```python
# Máximo por cuota = 25% del salario
salary_limit = salario_base * 0.25

# Calcular número de cuotas necesarias
if monto_prestamo <= salary_limit:
    n_cuotas = 1
else:
    n_cuotas = ceil(monto_prestamo / salary_limit)

cuota = monto_prestamo / n_cuotas

# Calcular lo ya cobrado en nóminas ANTERIORES
ya_cobrado = suma de NominaEmpleadoDeduccion 
             donde fecha_pago < nomina_date_actual
             y es el mismo préstamo

saldo = monto_prestamo - ya_cobrado

# Descontar esta nómina
if saldo <= 0:
    monto = 0  # Préstamo ya saldado
else:
    monto = min(cuota, saldo)  # No sobre-cobrar
```

**Ventaja**: Permite pausar la deuda en vacaciones sin perder el control.

---

## 🎯 Cálculo de DESCUENTOS por EVENTOS

Función: `_calcular_descuento_eventos()`

Los eventos como inasistencias, reposos, horas no laboradas generan descuentos automáticos.

### Valores Base

**Para empleados por días trabajados:**
```
salario_mensual = empleado.salario_base
salario_quincena = salario_mensual / 2
valor_dia = salario_quincena / (dias_trabajados_semana * 2)
```

**Ejemplo**: 
- Salario $1000/mes
- 5 días/semana
- Q2 = $500
- valor_dia = $500 / (5 * 2) = $50/día

**Para empleados por horas:**
```
valor_hora = salario_quincena / (horas_trabajadas_semana * 2)
```

**Ejemplo**:
- Salario $1000/mes
- 40 horas/semana
- Q2 = $500
- valor_hora = $500 / (40 * 2) = $6.25/hora

### Tipos de Eventos y Descuentos

#### 1. INASISTENCIA
```python
if evento.tipo == 'inasistencia' and evento.fecha en [q_start, q_end]:
    descuento = valor_dia * evento.cantidad
```

**Ejemplo**: 2 inasistencias en la quincena
- descuento = $50 × 2 = $100

#### 2. HORAS NO LABORADAS (Solo empleados por horas)
```python
if evento.tipo == 'horas no laboradas' and evento.fecha en [q_start, q_end]:
    descuento = valor_hora * evento.cantidad
```

**Ejemplo**: 8 horas no laboradas
- descuento = $6.25 × 8 = $50

#### 3. REPOSO (Licencia médica - Solo empleados por días)
```python
total_dias_reposo = (evento.fecha_fin - evento.fecha_inicio).days + 1

if total_dias_reposo <= 3:
    # Hasta 3 días: SIN DESCUENTO (ley de protección)
    descuento = 0

elif 4 <= total_dias_reposo <= 15:
    # 4-15 días: Descuentan los días que caen en la quincena
    ini = max(evento.fecha_inicio, q_start)
    fin = min(evento.fecha_fin, q_end)
    dias_en_quincena = (fin - ini).days + 1
    descuento = valor_dia * dias_en_quincena

elif total_dias_reposo > 15:
    # > 15 días: 33.34% de la quincena
    descuento = salario_quincena * 0.3334
```

**Ejemplos**:
- 2 días de reposo: $0 (protegido)
- 5 días de reposo (3 en Q1): $50 × 3 = $150
- 20 días de reposo: $500 × 0.3334 = $166.70

#### 4. VACACIONES
Las vacaciones **NO** generan descuentos automáticos; el cálculo del salario base se ajusta según el estado (ver sección de estados vacacionales).

---

## 🎁 Cálculo de CESTATICKET

Función: `_calcular_cestaticket()`

**Solo aplica en Q2 (segunda quincena).**

### Monto Base
Se obtiene de `nomina_constantes.json`:
```json
{
  "cestaticket_monto": 152000  // En Bs, o en unidades del sistema
}
```

### Reducción por Inasistencias
```python
inasistencias_mes = contar todas las inasistencias del mes

if inasistencias_mes <= 10:
    monto_final = monto_cestaticket  # Completo

elif inasistencias_mes > 10:
    exceso = inasistencias_mes - 10
    porcentaje_reduccion = min(exceso / 30, 1.0)
    # Capped al 100% (no puede ser negativo)
    monto_final = monto_cestaticket * (1 - porcentaje_reduccion)
```

**Tabla de Ejemplo** (asumiendo monto = 1000):
| Inasistencias | Reducción | Monto Final |
|---|---|---|
| 5 | 0% | 1000 |
| 10 | 0% | 1000 |
| 15 | 16.7% | 833 |
| 20 | 33.3% | 667 |
| 40 | 100% | 0 |

---

## 📊 Ejemplo Completo de Cálculo

### Datos del Empleado
- **Nombre**: Juan Pérez
- **Cedula**: V-1234567
- **Salario Mensual**: $1000 USD
- **Días/semana**: 5
- **Estado**: Activo

### Nómina Q2 - Junio 2024 (16-30 junio)
**Tasa de Cambio**: 53 Bs/USD

#### BONOS APLICABLES
- Bono Quincenal Desempeño: $50 (fijo)
- Bono Mensual (prima): $100 (fijo) - SÍ aplica en Q2

**Total Bonos = $150**

#### DEDUCCIONES APLICABLES
- IVSS: $1000 × (12/52) × 0.04 × 4 = $36.92
- LPH: $1000 × 0.01 = $10
- Préstamo: $50 (cuota)

**Deducciones Normales = $96.92**

#### EVENTOS EN ESTE PERÍODO
- 1 Inasistencia el 20/06
- Descuento = $500 / (5 × 2) = $50

**Deducciones por Eventos = $50**

#### CESTATICKET
- Inasistencias del mes: 4 (≤ 10)
- Monto: 152,000 Bs (sin reducción)

#### CÁLCULO FINAL

```
Salario Base Quincena (Q2)    = $1000 / 2 = $500.00
+ Total Bonos                  = $150.00
= Total Ingresos              = $650.00

Total Deducciones             = $96.92 + $50.00 = $146.92

Salario Final (USD)           = $650.00 - $146.92 = $503.08
Salario Final (Bs)            = $503.08 × 53 = 26,663.24 Bs

Cestaticket                    = 152,000 Bs
```

### Snapshots Generados

**NominaEmpleado**:
```
salario_base = 500.00
total_ingresos = 650.00
total_deducciones = 146.92
cestaticket_aplicado = 152000
salario_final_usd = 503.08
salario_final_bs = 26663.24
```

**NominaEmpleadoBono**:
```
[
  { bono_id: 1, nombre: "Desempeño", monto_aplicado: 50.00 },
  { bono_id: 2, nombre: "Prima", monto_aplicado: 100.00 }
]
```

**NominaEmpleadoDeduccion**:
```
[
  { deduccion_id: 1, nombre: "ivss", monto_aplicado: 36.92 },
  { deduccion_id: 2, nombre: "lph", monto_aplicado: 10.00 },
  { deduccion_id: 3, nombre: "prestamo", monto_aplicado: 50.00 },
  { deduccion_id: 4, nombre: "inasistencia", monto_aplicado: 50.00 }
]
```

---

## 🔄 Recalculación Automática

Cuando se crea o modifica un bono/deducción, el sistema busca nóminas "candidatas" para recalcular:

**Función**: `recalculate_nomina_if_pending()`

```python
if tipo_pago == 'unico' and tiene_fecha:
    # Recalcular solo nóminas del mismo mes/quincena no aprobadas
    
elif tipo_pago == 'quincenal':
    # Recalcular TODAS las nóminas futuras no aprobadas
    
elif tipo_pago == 'mensual':
    # Recalcular TODAS las nóminas futuras Q2 no aprobadas
```

**Nota**: Las nóminas aprobadas NO se recalculan (son inmutables).

---

## 🛡️ Casos Especiales y Consideraciones

### 1. Vacaciones que Cruzan Quincenas
```
Vacaciones: 10/06 - 20/06 (11 días)

Q1 (1-15): Estado INICIO
- Días trabajados = 15 - 9 = 6 días
- Salario Q1 = ($2000/30) × 6 = $400
- + Salario de Vacaciones (USD)
- + Bono Vacacional (USD)

Q2 (16-30): Estado REINTEGRO
- Días trabajados = 30 - 20 = 10 días
- Salario Q2 = ($2000/30) × 10 = $667
- Empleado se reactiva a "activo"
```

### 2. Empleados por Horas vs por Días
```
Empleado por HORAS:
- Solo descuentan "horas no laboradas"
- Inasistencias NO afectan

Empleado por DÍAS:
- Descuentan "inasistencias" y "reposos"
- "Horas no laboradas" NO aplica
```

### 3. Préstamos con Pausas
```
Préstamo $500 (2 cuotas de $250 cada una)
Q1: Descuento = $250
Q2: Empleado en vacaciones (evento): Sin descuento
Q3: Descuento = $250 (saldo $250 - $0 anteriores)
```

### 4. Bonos Únicos en Fechas Fronterizas
```
Bono 14/06 (día 14):
- Aplica en Q1 (14 ≤ 15)

Bono 15/06 (día 15):
- Aplica en Q1 (15 ≤ 15)

Bono 16/06 (día 16):
- Aplica en Q2 (16 > 15)
```

---

## 📈 Flujo de Auditoría

Todos los montos se registran como snapshots:
1. Se registran en `NominaEmpleadoBono` y `NominaEmpleadoDeduccion`
2. Si se recalcula, se borran y recrean (auditable vía timestamps)
3. Si se aprueba, la nómina se congela

---

## 🔗 Integración con Otros Módulos

### Eventos de Empleados
- `EventoEmpleado` → Genera descuentos automáticos en nómina
- `tipo_evento`: inasistencia, vacaciones, reposo, horas no laboradas
- Se consultan en tiempo de cálculo

### Tasa de Cambio
- Se obtiene al crear nómina (BCV o personalizada)
- Se guarda en `Nominas.tasa_dolar`
- Se usa para conversión USD → Bs al final

### Cestaticket
- Depende de `Cestaticket` y `CestaticketMes`
- Se reduce si hay inasistencias > 10 en el mes
- Solo Q2

---

## 📝 Notas Finales

1. **Idempotencia**: El recálculo es seguro; se borra y recrea todo
2. **Inmutabilidad**: Nóminas aprobadas no cambian
3. **Auditoría**: Todos los campos tienen `created_at` y `updated_at`
4. **Validación**: Cada deducción se valida antes de aplicar
5. **Escalabilidad**: Soporta miles de empleados con recálculos en segundo plano

