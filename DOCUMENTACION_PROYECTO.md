# Documentación del Proyecto - Sistema de Nóminas

## 📋 Descripción General

**Nominas App** es un sistema integral de gestión de nóminas de empleados desarrollado con:
- **Frontend**: Next.js 13+ (App Router)
- **Backend**: FastAPI con Python
- **Base de Datos**: PostgreSQL (SQLAlchemy ORM)
- **Autenticación**: JWT basado en roles y permisos

El sistema permite crear, gestionar y calcular nóminas quincenales con soporte para bonos, deducciones, eventos de empleados (inasistencias, vacaciones, reposos) y cálculos complejos de salarios.

---

## 🏗️ Arquitectura General

### Estructura del Proyecto

```
nominas-app/
├── app/                           # Frontend Next.js
│   ├── (auth)/                   # Rutas de autenticación
│   │   └── login/
│   ├── (system)/                 # Rutas del sistema (protegidas)
│   │   ├── nomina/              # Gestión de nóminas
│   │   ├── employees/           # Gestión de empleados
│   │   ├── bonus/               # Configuración de bonos
│   │   ├── deductions/          # Configuración de deducciones
│   │   ├── config/              # Configuración del sistema
│   │   ├── audits/              # Auditoría de cambios
│   │   └── dashboard/           # Dashboard de inicio
│   ├── components/              # Componentes reutilizables
│   ├── context/                 # Contexto global (autenticación)
│   └── layout.jsx
│
├── db/                           # Backend FastAPI
│   ├── models/                  # Modelos SQLAlchemy
│   │   ├── empleado_model.py
│   │   ├── nominas_model.py
│   │   ├── bono_model.py
│   │   ├── deduccion_model.py
│   │   ├── evento_empleado_model.py
│   │   └── ... otros modelos
│   ├── schemas/                 # Esquemas Pydantic
│   │   ├── nomina_empleado_schema.py
│   │   ├── bono_schema.py
│   │   ├── deduccion_schema.py
│   │   └── ... otros esquemas
│   ├── crud/                    # Operaciones de BD
│   │   ├── base_crud.py
│   │   ├── nominas_crud.py
│   │   └── ... otros CRUD
│   ├── routers/                 # Endpoints API
│   │   ├── nominas_router.py
│   │   ├── empleado_router.py
│   │   ├── bono_relaciones_router.py
│   │   ├── deduccion_relaciones_router.py
│   │   ├── router.py            # Router principal
│   │   └── ... otros routers
│   ├── utils/                   # Utilidades
│   │   ├── auth.py             # Autenticación JWT
│   │   ├── excel_utils.py      # Generación de reportes
│   │   ├── security.py         # Seguridad
│   │   └── mixins.py
│   ├── migrations/              # Migraciones SQL
│   ├── seeders/                 # Data seeders
│   ├── nomina_constantes.json  # Constantes del sistema
│   └── main.py                  # Aplicación FastAPI
│
└── public/                       # Archivos estáticos
```

---

## 🔐 Modelos de Datos Principales

### 1. **Empleado** (`empleado_model.py`)
Almacena información personal y laboral de empleados:
- `cedula`: ID único del empleado
- `nombre`, `apellido`: Datos personales
- `salario_base`: Salario mensual (USD) - según memoria del proyecto
- `es_por_hora`: Si es empleado por horas
- `dias_trabajados_semana`: Días de trabajo por semana
- `horas_trabajadas_semana`: Horas de trabajo por semana
- `estado`: Activo, Permiso, Inactivo
- `fecha_ingreso`: Fecha de inicio

### 2. **Nominas** (`nominas_model.py`)
Registro de nómina (encabezado):
- `id`: ID único
- `fecha_pago`: Fecha de pago (determina si es Q1 o Q2)
- `tasa_dolar`: Tasa de cambio USD→Bs vigente en la fecha
- `aprobada`: Flag de aprobación (inmutable después)

### 3. **NominaEmpleado** (`nomina_empleado_model.py`)
Detalle de salario por empleado en una nómina:
- `nomina_id`, `empleado_cedula`: Claves foráneas compuestas
- `salario_base`: Salario base quincena (USD)
- `total_ingresos`: Base + bonos (USD)
- `total_deducciones`: Suma de deducciones (USD)
- `cestaticket_aplicado`: Cantidad de cestaticket (Bs)
- `salario_final_bs`: Final en Bs = (ingresos - deducciones) × tasa
- `salario_final_usd`: Final en USD

### 4. **NominaEmpleadoBono** y **NominaEmpleadoDeduccion**
Snapshots de bonos y deducciones aplicados a cada empleado-nómina:
- Registro de auditoría: qué se aplicó y cuánto
- No son editables después de cálculo

### 5. **Bono** (`bono_model.py`)
Definición de bonificaciones:
- `nombre`: Nombre del bono
- `monto`: Valor (fijo o porcentaje)
- `es_porcentaje`: Bool para determinar si es % o monto fijo
- `tipo_pago`: "quincenal", "mensual", "unico"
- `fecha`: Fecha relevante (para bonos únicos)

### 6. **BonoEmpleado**
Relación muchos-a-muchos entre empleados y bonos que aplican a ellos.

### 7. **Deduccion** (`deduccion_model.py`)
Definición de descuentos (impuestos, prestamos, etc.):
- `nombre`: Nombre de la deducción
- `monto`: Valor base
- `es_porcentaje`: Bool
- `tipo_pago`: "quincenal", "mensual", "unico"
- `formula_calculo`: Fórmula especial ("ivss", "spf", "lph", "faov", "prestamo", "manual")
- `fecha`: Fecha relevante

### 8. **DeduccionEmpleado**
Relación muchos-a-muchos entre empleados y deducciones.

### 9. **EventoEmpleado** (`evento_empleado_model.py`)
Eventos que afectan el cálculo:
- `tipo_evento`: "inasistencia", "vacaciones", "reposo", "horas no laboradas"
- `fecha`: Para eventos simples (inasistencias)
- `fecha_inicio`, `fecha_fin`: Para rangos (vacaciones, reposo)
- `cantidad`: Cantidad de horas/días
- `monto_vacaciones_usd`, `monto_bono_vac_usd`: Beneficios vacacionales

### 10. **Cestaticket** y **CestaticketMes**
Registro de cesta ticket (beneficio social):
- Monto variable según inasistencias del mes
- Solo se aplica en 2da quincena (Q2)

---

## 🔌 API Endpoints Principales

### Nóminas
- `POST /nominas/crear` - Crear nómina para un período
- `GET /nominas/{id}/detalle-empleados` - Ver detalles de empleados
- `GET /nominas/{nomina_id}/empleado/{cedula}/detalle` - Ver detalle de un empleado
- `POST /nominas/{nomina_id}/recalcular` - Recalcular nómina (si no está aprobada)
- `POST /nominas/{nomina_id}/aprobar` - Aprobar nómina (inmutable)
- `GET /nominas/{nomina_id}/empleado/{cedula}/payslip` - Descargar recibo
- `GET /nominas/{nomina_id}/reporte` - Descargar reporte Excel

### Empleados
- `GET /empleados` - Listar empleados
- `POST /empleados` - Crear empleado
- `GET /empleados/{cedula}` - Ver detalle
- `PUT /empleados/{cedula}` - Editar empleado

### Bonos
- `GET /bonos` - Listar bonos
- `POST /bonos` - Crear bono
- `GET /bonos_relaciones` - Ver asignaciones de bonos a empleados
- `POST /bonos_relaciones` - Asignar bono a empleado

### Deducciones
- `GET /deducciones` - Listar deducciones
- `POST /deducciones` - Crear deducción
- `GET /deducciones_relaciones` - Ver asignaciones de deducciones
- `POST /deducciones_relaciones` - Asignar deducción a empleado

### Eventos de Empleados
- `POST /eventos_empleados` - Crear evento (inasistencia, vacaciones, etc.)
- `GET /eventos_empleados` - Listar eventos

---

## 🔄 Flujo de Creación de Nómina

1. **Usuario selecciona fecha de pago**
   - Si día ≤ 15 → Quincena 1 (Q1)
   - Si día > 15 → Quincena 2 (Q2)

2. **Sistema obtiene tasa de cambio**
   - Busca tasa personalizada vigente
   - Si no existe, consulta API BCV en tiempo real
   - Guarda en histórico de tasas

3. **Se crean registros base**
   - `Nominas`: encabezado con fecha y tasa
   - `NominaEmpleado`: una fila por empleado activo/permiso

4. **Se recalculan todos los montos** (función `_rebuild_nomina_snapshots`)
   - Determina estado vacacional del empleado
   - Calcula salario según estado (activo, inicio vac, en curso, reintegro)
   - Aplica bonos según tipo de pago
   - Aplica deducciones (incluyendo eventos)
   - Crea snapshots en `NominaEmpleadoBono` y `NominaEmpleadoDeduccion`

5. **Cálculo final**
   - Total ingresos = salario quincena + bonos
   - Total deducciones = fórmulas + eventos + cestaticket
   - Salario final USD = total ingresos - deducciones
   - Salario final Bs = salario final USD × tasa de cambio

---

## 👥 Sistema de Roles y Permisos

Basado en JWT con permisos granulares:
- `nominas:crear` - Crear nóminas
- `nominas:editar` - Editar nóminas
- `nominas:eliminar` - Eliminar nóminas
- `empleados:crear`, `empleados:editar`, `empleados:eliminar`
- `bonos:crear`, `bonos:editar`, `bonos:eliminar`
- `deducciones:crear`, `deducciones:editar`, `deducciones:eliminar`

Cada endpoint valida permisos antes de ejecutar.

---

## 🔧 Configuración del Sistema

Archivo: `nomina_constantes.json`

Contiene constantes de cálculo:
- `dias_aguinaldo`: Días equivalentes para cálculo de utilidades
- `dias_bono_vacacional`: Días equivalentes para bono vacacional
- `cestaticket_monto`: Monto mensual de cesta ticket
- Otros parámetros de cálculo

---

## 📊 Generación de Reportes

### Recibo de Pago (Payslip)
Archivo: `excel_utils.py` → `create_payslip_excel()`
- Documento individual por empleado
- Muestra: salario base, bonos detallados, deducciones, total

### Reporte de Nómina
Función: `create_payroll_report_excel()`
- Documento consolidado de toda la nómina
- Una fila por empleado con totales

---

## 🔐 Seguridad

- **Autenticación**: JWT con refresh tokens
- **Autorización**: Basada en roles y permisos
- **Auditoría**: Todos los cambios se registran en tabla `auditorias`
- **Validación**: Pydantic schemas validan entrada
- **Aprobación**: Nóminas aprobadas son inmutables

---

## 🚀 Flujo de Desarrollo

### Iniciar Backend
```bash
cd db
python -m venv .venv
source .venv/bin/activate  # o .venv\Scripts\activate en Windows
pip install -r requirements.txt
python main.py
```

### Iniciar Frontend
```bash
npm install
npm run dev
```

---

## 📝 Notas Importantes

1. **Salarios en USD**: `empleado.salario_base` está en USD; se multiplica por tasa_dolar al pagar en Bs
2. **Quincenas**: Períodos de 15 días (Q1: 1-15, Q2: 16-último día)
3. **Vacaciones**: Estado especial que modifica cálculo de salario base
4. **Cestaticket**: Solo en Q2; reducido si hay >10 inasistencias en el mes
5. **Nóminas aprobadas**: No se pueden recalcular ni editar

---

## 📚 Documentos Relacionados

- [Flujo de Cálculo de Nóminas](./DOCUMENTACION_CALCULO_NOMINAS.md) - Detalle técnico del cálculo
- [AGENTS.md](./AGENTS.md) - Notas sobre versión de Next.js
- [CLAUDE.md](./CLAUDE.md) - Instrucciones del proyecto

