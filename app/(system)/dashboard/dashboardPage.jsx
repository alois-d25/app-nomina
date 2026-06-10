'use client'
import Link from "next/link";
import { MdOutlineBadge, MdCurrencyExchange, MdEventNote } from "react-icons/md";
import { PiUsersBold } from "react-icons/pi";
import { FaSackDollar } from "react-icons/fa6";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Can from "@/components/Can";
import { PERMISSIONS } from "@/app/config/permissions";

const formatBs = (valor) =>
    new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(valor || 0));

const formatUsd = (valor) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(valor || 0));

const formatFecha = (iso) => {
    if (!iso) return "—";
    return new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
};

// Convierte 'YYYY-MM' a una etiqueta legible tipo 'may 2026'
const formatMes = (mes) => {
    const [anio, m] = mes.split("-");
    const fecha = new Date(Number(anio), Number(m) - 1, 1);
    return fecha.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
};

const DashboardPage = ({ resumen }) => {
    const {
        total_empleados = 0,
        empleados_activos = 0,
        gastos_mensuales_usd = 0,
        tasa_actual = null,
        tasa_tipo = null,
        ultimas_nominas = [],
        grafica_gastos = [],
    } = resumen || {};

    const dataCards = [
        {
            title: "Total de empleados",
            quantity: <span className="text-primary">{total_empleados}</span>,
            icon: <MdOutlineBadge />,
            desc: "Empleados registrados en el sistema",
        },
        {
            title: "Empleados activos",
            quantity: empleados_activos,
            icon: <PiUsersBold />,
            desc: "Empleados con estado activo",
        },
        {
            title: "Gastos del mes",
            quantity: <span className="text-primary">{formatUsd(gastos_mensuales_usd)}</span>,
            icon: <FaSackDollar />,
            desc: "Total pagado en la nómina más reciente",
        },
        {
            title: "Tasa de cambio USD",
            quantity: tasa_actual ? `Bs. ${formatBs(tasa_actual)}` : "—",
            icon: <MdCurrencyExchange />,
            desc: tasa_tipo ? `Tasa ${tasa_tipo} vigente` : "Sin tasa registrada",
        },
    ];

    const chartData = grafica_gastos.map((g) => ({ ...g, label: formatMes(g.mes) }));

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold">Resumen general</h2>
                    <p className="text-on-surface-variant text-sm">Indicadores clave del sistema de nóminas</p>
                </div>
                <Can permission={PERMISSIONS.EMPLEADOS_EDITAR}>
                    <Link href="/employees/events" className="btn btn-primary">
                        <MdEventNote className="text-xl" /> Registrar eventos
                    </Link>
                </Can>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {dataCards.map((card, index) => (
                    <div key={index} className="bg-surface-container-lowest shadow-sm rounded-md p-4">
                        <div className="flex justify-between items-center">
                            <h3>{card.title}</h3>
                            <span className="bg-primary text-on-primary text-3xl rounded-full p-3">{card.icon}</span>
                        </div>
                        <div className="divider my-0"></div>
                        <h2 className="mt-2">{card.quantity}</h2>
                        <span className="text-on-surface-variant text-sm">{card.desc}</span>
                    </div>
                ))}
            </div>

            {/* Gráfica de barras: gasto total pagado (salario + bonos) en USD por mes */}
            <div className="mt-4 bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/30 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-outline-variant/20 pb-3">
                    <h3 className="font-headline-md">Volumen de gastos de nómina (USD)</h3>
                    <span className="text-sm text-on-surface-variant">Comparativa mensual</span>
                </div>
                <div className="min-h-[300px] w-full">
                    {chartData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-on-surface-variant">
                            No hay nóminas registradas para mostrar la gráfica.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde4dd" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#434933', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#434933', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [formatUsd(value), "Gasto total"]}
                                />
                                <Bar dataKey="total_usd" fill="#4b6700" radius={[6, 6, 0, 0]} maxBarSize={80} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Tabla: últimas 6 nóminas */}
            <div className="flex flex-col mt-4 shadow-md rounded-t-md">
                <div className="flex px-4 py-2 justify-between items-center bg-surface-container-lowest rounded-t-md">
                    <h3>Últimas nóminas</h3>
                </div>
                <div className="overflow-x-auto rounded-b-md">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID nómina</th>
                                <th>Fecha de pago</th>
                                <th>Empleados</th>
                                <th>Monto total (Bs.)</th>
                                <th>Monto total (USD)</th>
                                <th>Tasa usada</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface-container-lowest">
                            {ultimas_nominas.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-on-surface-variant">
                                        No hay nóminas registradas aún.
                                    </td>
                                </tr>
                            ) : (
                                ultimas_nominas.map((nomina) => (
                                    <tr key={nomina.id}>
                                        <td className="font-mono">#{nomina.id}</td>
                                        <td>{formatFecha(nomina.fecha_pago)}</td>
                                        <td>{nomina.total_empleados}</td>
                                        <td className="font-medium">{nomina.monto_total_bs != null ? `Bs. ${formatBs(nomina.monto_total_bs)}` : "—"}</td>
                                        <td className="font-medium">{nomina.monto_total_usd != null ? formatUsd(nomina.monto_total_usd) : "—"}</td>
                                        <td>
                                            <div className="badge badge-outline badge-primary">
                                                {nomina.tasa_dolar ? `Bs. ${formatBs(nomina.tasa_dolar)}` : "—"}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
