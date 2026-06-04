'use client';

import { useAuth } from '@/app/context/auth_context';
import { ExchangeRateService } from '@/services/exchangeRate.service';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  MdAdd, 
  MdAccountBalance, 
  MdCurrencyExchange, 
  MdDownload, 
  MdClose,
  MdCheckCircle
} from 'react-icons/md';
import { toast } from "react-toastify";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

const RateCard = ({ title, rate, type }) => {
  const isBCV = type === 'BCV';
  // Redondeamos a 2 decimales
  const formattedRate = !isNaN(rate) ? Number(rate).toFixed(2) : rate;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 mr-5 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${isBCV ? 'bg-primary' : 'bg-secondary'}`}></div>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className={` rounded-md ${isBCV ? 'text-primary bg-primary-container/30' : 'text-secondary bg-secondary-container/50'}`}>
            {isBCV ? <MdAccountBalance size={20} /> : <MdCurrencyExchange size={20} />}
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
        </div>
      </div>
      <div className="mb-2">
        <span className="font-headline-xl text-headline-xl text-on-surface">Bs. {formattedRate}</span>
        <span className="font-body-sm text-body-sm text-on-surface-variant ml-1">/ USD</span>
      </div>
    </div>
  );
};

const HistoryRow = ({ date, type, value, fuente, userName }) => {
  return (
    <tr className="hover:bg-surface-container/50 transition-colors">
      <td className="py-4 px-3 whitespace-nowrap">
        <div className="font-medium">{date}</div>
      </td>
      <td className="py-4 px-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md font-label-sm text-label-sm border`}>
          {type}
        </span>
      </td>
      <td className="py-4 px-3 font-medium">Bs. {Number(value).toFixed(2)}</td>
      <td className="py-4 px-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-label-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="capitalize text-sm font-medium">{userName}</span>
        </div>
      </td>
    </tr>
  );
};

export default function ExchangeRatesPage() {
  const [tasaActual, setTasaActual] = useState(null);
  const [historial, setHistorial] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [opcionTasa, setOpcionTasa] = useState('BCV'); 
  const [montoPersonalizado, setMontoPersonalizado] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  // La tasa activa siempre será el registro más reciente del historial
  const tasaActiva = historial.length > 0 ? historial[0] : null;

  // Construye los datos de la gráfica agrupando el historial por fecha (últimos 30 puntos)
  const dataChart = useMemo(() => {
    const porFecha = {};
    // historial viene ordenado desc; al invertir queda ascendente y el último valor por fecha es el más reciente
    [...historial].reverse().forEach((r) => {
      const fecha = String(r.fecha).slice(0, 10);
      if (!porFecha[fecha]) porFecha[fecha] = { name: fecha };
      const valor = Number(r.valor);
      if (r.tipo === 'BCV') porFecha[fecha].bcv = valor;
      else if (r.tipo === 'PARALELO') porFecha[fecha].parallel = valor;
      else if (r.tipo === 'PERSONALIZADO') porFecha[fecha].personalizado = valor;
    });

    const formateador = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
    return Object.values(porFecha)
      .sort((a, b) => new Date(a.name) - new Date(b.name))
      .slice(-30)
      .map((punto) => ({
        ...punto,
        name: formateador.format(new Date(`${punto.name}T00:00:00`)),
      }));
  }, [historial]);

  const cargarDatos = async () => {
    try {
        // La tasa USDT (DolarVZLA) se deshabilitó por expiración de la API key.
        const [dataBCV, dataHistorial] = await Promise.all([
          ExchangeRateService.getCurrentBCVPrice(),
          ExchangeRateService.getHistory()
        ]);

        setTasaActual(dataBCV);
        const historialOrdenado = Array.isArray(dataHistorial)
          ? dataHistorial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          : [];
        setHistorial(historialOrdenado);
    } catch (error) {
        console.error("Error obteniendo los datos:", error);
        toast.error("Error al cargar la información de las tasas");
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [fechaFilter, setFechaFilter] = useState("");
  const itemsPerPage = 5;

  // --- LÓGICA DE FILTRADO ---
  const filteredHistorial = historial.filter((registro) => {
    if (fechaFilter === "") return true;
    return registro.fecha === fechaFilter;
  });

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const currentRecords = filteredHistorial.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  // Reajusta la página si queda fuera de rango (ej: al aplicar un filtro de fecha)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [totalPages, currentPage]);

  const handleGuardarTasa = async () => {
    setIsSaving(true);
    try {
      let payload = {};
      const fechaHoy = new Date().toISOString().split('T')[0];

      // Normaliza cualquier fecha/datetime ('2026-06-01 15:00:45.998Z' o '2026-06-01T...') a 'YYYY-MM-DD'
      const normalizarFecha = (valor) => (valor ? String(valor).slice(0, 10) : fechaHoy);

      // Extraemos el ID del usuario desde "sub" y lo convertimos a entero
      const currentUserId = user?.sub ? parseInt(user.sub) : null;

      if (opcionTasa === 'BCV') {
        payload = {
          tipo: "BCV",
          valor: Number(parseFloat(tasaActual.usd).toFixed(2)),
          fecha: normalizarFecha(tasaActual.date),
          fuente: "api",
          usuario_id: currentUserId
        };
      } else if (opcionTasa === 'PERSONALIZADO') {
        if (!montoPersonalizado || parseFloat(montoPersonalizado) <= 0) {
          toast.warning("Ingrese un monto válido");
          setIsSaving(false);
          return;
        }
        payload = {
          tipo: "PERSONALIZADO",
          valor: Number(parseFloat(montoPersonalizado).toFixed(2)),
          fecha: fechaHoy,
          fuente: "usuario",
          usuario_id: currentUserId
        };
      }

      await ExchangeRateService.saveExchangeRate(payload);
      toast.success("Tasa guardada exitosamente en el historial");
      
      setIsModalOpen(false);
      setMontoPersonalizado('');
      cargarDatos(); 

    } catch (error) {
      console.error("Error guardando la tasa:", error);
      toast.error("Error al guardar la tasa. Revisa la consola.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-container-max mx-auto relative">
      
      {/* -------------------- MODAL -------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md p-6 rounded-2xl shadow-xl border border-outline-variant/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline-md text-headline-md text-on-surface">Registrar Nueva Tasa</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 mb-6">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Seleccione el origen de la tasa que desea aplicar y guardar en el historial:
              </p>

              <select 
                className="w-full p-3 rounded-lg border border-outline-variant bg-surface select focus:outline-none focus:ring-2 focus:ring-primary"
                value={opcionTasa}
                onChange={(e) => setOpcionTasa(e.target.value)}
              >
                <option value="BCV">Tasa Oficial API BCV (Bs. {Number(tasaActual?.usd).toFixed(2) || '...'})</option>
                <option value="PERSONALIZADO">Tasa Personalizada (Ingreso Manual)</option>
              </select>

              {opcionTasa === 'PERSONALIZADO' && (
                <div className="mt-2">
                  <label className="block font-label-md text-label-md text-on-surface mb-1">Monto de Tasa (Bs.)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Ej. 36.50"
                    value={montoPersonalizado}
                    onChange={(e) => setMontoPersonalizado(e.target.value)}
                    className="w-full p-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleGuardarTasa}
                disabled={isSaving}
                className="bg-primary hover:bg-surface-tint text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md transition-colors shadow-sm disabled:opacity-70"
              >
                {isSaving ? 'Guardando...' : 'Guardar Tasa'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------ FIN MODAL ------------------ */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestión de Tasas de Cambio</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Monitorea y actualiza las tasas de conversión de USD activas para los cálculos de nómina.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-surface-tint text-on-primary px-4 py-2 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap self-start md:self-auto"
        >
          <MdAdd size={20} />
          Actualizar Tasa
        </button>
      </div>

      {/* TARJETA PEQUEÑA: TASA ACTIVA */}
      {tasaActiva && (
        <div className="bg-surface-container-lowest text-on-primary-container p-4 rounded-xl mb-6 flex flex-col md:flex-row md:items-center justify-between border border-primary/20 shadow-sm">
          <div className="flex items-center gap-3 mb-2 md:mb-0">
            <MdCheckCircle size={24} className="text-primary" />
            <div>
              <p className="font-label-lg font-bold">Tasa Activa para Cálculos</p>
              <p className="font-body-md text-on-primary-container/80">
                Se está utilizando la tasa <span className="font-bold">{tasaActiva.tipo}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-headline-md font-bold">Bs. {Number(tasaActiva.valor).toFixed(2)}</p>
            <p className="font-label-sm opacity-80">Actualizada el {tasaActiva.fecha}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-y-4">
        <div className="lg:col-span-1 flex flex-col gap-stack-md">
          <RateCard
            title="Tasa BCV"
            rate={tasaActual?.usd || <span className="loading loading-spinner loading-xs"></span>}
            type="BCV"
          />
        </div>

        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex justify-between items-center mb-6 border-b border-outline-variant/20 pb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Análisis de Tendencia (30 días)</h3>
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {dataChart.length === 0 ? (
              <div className="h-full min-h-[250px] flex items-center justify-center text-on-surface-variant font-body-sm">
                No hay datos históricos suficientes para mostrar la tendencia.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataChart}>
                  <defs>
                    <linearGradient id="colorBcv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4b6700" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4b6700" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde4dd" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#434933', fontSize: 12}} />
                  <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [`Bs. ${Number(value).toFixed(2)}`, name === 'bcv' ? 'BCV' : name === 'parallel' ? 'Paralela' : 'Personalizada']}
                  />
                  <Legend formatter={(value) => (value === 'bcv' ? 'BCV' : value === 'parallel' ? 'Paralela' : 'Personalizada')} />
                  <Area type="monotone" dataKey="parallel" stroke="#625e58" strokeWidth={2} strokeDasharray="5 5" fill="transparent" connectNulls />
                  <Area type="monotone" dataKey="bcv" stroke="#4b6700" strokeWidth={3} fillOpacity={1} fill="url(#colorBcv)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-[0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          
          {/* ENCABEZADO CON FILTRO Y EXPORTACIÓN */}
          <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-bright flex-wrap gap-3">
            <h3 className="font-headline-md text-headline-md text-on-surface">Historial de Cambios</h3>
            <div className="flex gap-2 items-center">
              <input 
                type="date" 
                value={fechaFilter}
                onChange={(e) => { 
                  setFechaFilter(e.target.value); 
                  setCurrentPage(1); // Reiniciar a la página 1 al filtrar
                }}
                className="select focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant px-3 py-1.5 rounded-md"
              />
              {fechaFilter && (
                <button 
                  onClick={() => { setFechaFilter(""); setCurrentPage(1); }}
                  className="btn btn-ghost btn-xs text-error"
                >
                  Limpiar
                </button>
              )}
              <button className="btn btn-outline btn-primary px-3 py-1.5 rounded-md transition-colors flex items-center gap-2">
                <MdDownload size={18} /> Exportar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-container-low z-10">
                <tr className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="py-3 px-3 font-medium">Fecha</th>
                  <th className="py-3 px-3 font-medium">Tipo de Tasa</th>
                  <th className="py-3 px-3 font-medium">Valor (Bs.)</th>
                  <th className="py-3 px-3 font-medium">Usuario / Fuente</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/20">
                {currentRecords.map((registro) => {
                  let nombreMostrar = 'Sistema API';
                  if (registro.usuario_id) {
                      nombreMostrar = registro.empleado_nombre 
                          ? `${registro.empleado_nombre} ${registro.empleado_apellido}`
                          : `Usuario ID: ${registro.usuario_id}`;
                  }
                
                  return (
                    <tr key={registro.id}>
                      <td className="py-3 px-3">{registro.fecha}</td>
                      <td className="py-3 px-3">{registro.tipo}</td>
                      <td className="py-3 px-3 text-right">{Number(registro.valor).toFixed(2)}</td>
                      <td className="py-3 px-3">{nombreMostrar}</td>
                    </tr>
                  );
                })}
                {currentRecords.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-on-surface-variant">
                      No se encontraron registros para esta fecha.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-base-200/50 border-t border-base-300">
              <div className="flex items-center justify-between">
                  <div className="text-sm text-base-content/70 font-body-sm">
                      Mostrando {filteredHistorial.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredHistorial.length)} de{" "}
                      {filteredHistorial.length} registros
                  </div>
                  <div className="join">
                      <button 
                          className="join-item btn btn-sm" 
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => prev - 1)}
                      >
                          <FaChevronLeft />
                      </button>
                      <button className="join-item btn btn-sm btn-primary">{currentPage} de {totalPages || 1}</button>
                      <button
                          className="join-item btn btn-sm"
                          disabled={currentPage >= totalPages || totalPages === 0}
                          onClick={() => setCurrentPage(prev => prev + 1)}
                      >
                          <FaChevronRight />
                      </button>
                  </div>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}