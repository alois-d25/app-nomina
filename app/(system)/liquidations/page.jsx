'use client';
import Link from "next/link";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { FaAnglesRight, FaChevronLeft, FaChevronRight, FaDownload, FaRegFilePdf } from "react-icons/fa6";

const LiquidationsPage = () => {
    const [inputValue, setInputValue] = useState('')
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const data = [
        {
            'id':1,
            'name':'Juan',
            'last_name':'Perez',
            'cedula': 30785932,
            'cargo': "Asistente",
            'estado': 0
        },
        {
            'id':2,
            'name':'Maria',
            'last_name':'Gomez',
            'cedula': 28743721,
            'cargo': "Docente",
            'estado': 0
        },
        {
            'id':3,
            'name':'Pedro',
            'last_name':'Rodriguez',
            'cedula': 8943526,
            'cargo': "Mantemiento",
            'estado': 1
        },
    ]

    const liqData = [
        {
            'concepto':'Antigüedad',
            'calculo':150,
            'dias':60,
            'año': true
        },
        {
            'concepto':'Utilidades',
            'calculo':150,
            'dias':25,
            'año': false
        },
        {
            'concepto':'Antigüedad',
            'calculo':150,
            'dias':90,
            'año': false
        },
        {
            'concepto':'Prestamos',
            'calculo':-5000,
            'dias':1,
            'año': false,
            'prestamo': true
        },
    ]

    const obtenerTotalLiquidar = () => {
        if (!selectedEmployee) return 0;
    
        return liqData.reduce((acc, info) => {
            if (info.prestamo) {
                return acc + info.calculo; // Suma el valor negativo (resta en la práctica)
            }
            
            const monto = info.año 
                ? selectedEmployee.tiempoServicio.años * info.calculo * info.dias
                : info.calculo * info.dias;
                
            return acc + monto;
        }, 0);
    };
    
    const totalA_Liquidar = obtenerTotalLiquidar();

    const handleSelectEmployee = (employee) => {
        // simulam la data que fetch
        const fetchedData = {
            ...employee,
            fechaIngreso: '12/10/26',
            salarioIntegral: 4500,
            tiempoServicio: {'años':13, 'meses':10, 'dias':27}
        };
        setSelectedEmployee(fetchedData);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h2>Cálculo de liquidaciones</h2>
                    <p className="text-lg text-on-surface-variant">Gestión y procesamiento de liquidaciones de los empleados</p>
                </div>

                <div>
                    <button className="btn btn-primary"><FaRegFilePdf className="text-xl"/> Exportar reporte</button>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2 bg-surface-container-lowest shadow-md rounded-md p-4">
                            <h4 className="font-bold">Selección de empleado</h4>
                            <fieldset className="fieldset">
                                <legend className="text-sm">Buscar por nombre o cédula</legend>
                                <label className="input focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                                    <FaSearch />
                                    <input type="search" disabled={!!selectedEmployee} className="bg-surface-container-lowes)" placeholder="Ej:13456427 / Juan Peréz" value={inputValue} onChange={(e) => setInputValue(e.target.value)}/>
                                </label>
                            </fieldset>
                        </div>
                        
                        {selectedEmployee ? (
                            <div className="flex flex-col p-4 gap-4 bg-surface-container-lowest shadow-md rounded-md transition-all">
                                <div className="flex flex-col">
                                    <h4 className="font-bold">Resumen laboral de</h4>
                                    <p className="text-primary font-bold">{selectedEmployee.name} {selectedEmployee.last_name}</p>
                                    <div className="divider my-0"></div>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-on-surface-variant">Cédula</span>
                                    <span className="font-bold">{selectedEmployee.cedula}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-on-surface-variant">Fecha de ingreso</span>
                                    <span className="font-bold">{selectedEmployee.fechaIngreso}</span>
                                </div>
                                <div className="flex flex-row justify-between">
                                    <span className="text-on-surface-variant">Salario integral</span>
                                    <span className="font-bold">${selectedEmployee.salarioIntegral}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-on-surface-variant">Tiempo de servicio</p>
                                    <p className="font-bold">
                                        {selectedEmployee.tiempoServicio.años} años
                                        {" "+ selectedEmployee.tiempoServicio.meses} meses
                                        {" "+ selectedEmployee.tiempoServicio.dias} días
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 gap-4 bg-surface-container-lowest shadow-md rounded-md border border-dashed border-outline-variant text-on-surface-variant">
                                <p>Seleccione un empleado en la tabla para ver su resumen laboral.</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex-1/3 flex-col bg-surface-container-lowest shadow-md rounded-md">
                    {selectedEmployee ? (
                        <div>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex gap-2">
                                    <div className="flex gap-2 items-center">
                                        <p>Fecha de egreso:</p>
                                        <input type="date" className="input w-min focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant"/>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <p>Motivo:</p>
                                        <select defaultValue="Seleccione un motivo" className="select w-min focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                                            <option disabled={true}>Seleccione un motivo</option>
                                            <option className="hover:bg-primary hover:text-on-primary">Renuncia voluntaria</option>
                                            <option className="hover:bg-primary hover:text-on-primary">Despido</option>
                                            <option className="hover:bg-primary hover:text-on-primary">Traslado</option>
                                        </select>
                                    </div>
                                </div>

                                <h4 className="font-bold">Desglose de Cálculo</h4>

                                <div>
                                    <table className="table shadow-sm rounded">
                                        <thead className="shadow-sm">
                                            <tr className="text-black">
                                                <th>Concepto</th>
                                                <th>Base cálculo</th>
                                                <th>Días/Meses</th>
                                                <th>Monto (Bs)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {liqData.map((info,index) => (
                                                <tr key={index} className="shadow-sm">
                                                    {info.prestamo ? (
                                                        <>
                                                            <td className="text-error">{info.concepto}</td>
                                                            <td>-</td>
                                                            <td>-</td>
                                                            <td className="text-error">{info.calculo}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>{info.concepto}</td>
                                                            <td>Bs. {info.calculo}/día</td>
                                                            <td>{info.año ? (`${info.dias} días/año`):(`${info.dias} días`)}</td>
                                                            <td>
                                                                {info.año ? (
                                                                    selectedEmployee.tiempoServicio.años * info.calculo * info.dias
                                                                ) : (
                                                                    info.calculo * info.dias
                                                                )}
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex items-center justify-between border p-4 bg-surface-container-high rounded-md border-primary">
                                    <div className="flex flex-col justify-center">
                                        <p className="text-primary font-bold">Total a liquidar</p>
                                        <p className="text-sm">Tasa de cambio referencial: Bs 517 / USD</p>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <span className="text-primary text-xl font-bold">Bs. {totalA_Liquidar}</span>
                                        <span className="text-primary text-xl font-bold">&asymp; $ {totalA_Liquidar/517} </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end w-full">
                                    <button className="btn btn-error w-min btn-outline" onClick={() => setSelectedEmployee(null)}>Cancelar</button>
                                    <button className="btn btn-primary w-min whitespace-nowrap">Procesar liquidación</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 p-4">
                            <h4 className="font-bold">Resultados</h4>
                            
                            <table className="table shadow-sm">
                                <thead className="shadow-sm">
                                    <tr className="text-black">
                                        <th></th>
                                        <th>Cedula</th>
                                        <th>Nombre</th>
                                        <th>Cargo</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((emp) => (
                                            <tr key={emp.id} className="shadow-sm">
                                                <td>
                                                    <div className="avatar avatar-placeholder">
                                                        <div className="bg-surface-container-lowest border border-primary text-(--on-primary-container) w-10 rounded-full">
                                                            <span className="text-xl">{`${emp.name[0]}${emp.last_name[0]}`}</span>
                                                        </div>
                                                    </div>
                                                </td>
        
                                                <td>{emp.cedula}</td>
                                                <td>{emp.name + " " + emp.last_name}</td>
                                                <td>{emp.cargo}</td>
                                                <td><button onClick={() => handleSelectEmployee(emp)} className="btn btn-primary btn-outline"><FaAnglesRight className="text-lg"/></button></td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>

                            <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-base-content/70">
                                        Mostrando 1 a {data.length} de{" "}
                                        {data.length} registros
                                    </div>
                                    <div className="join">
                                        <button className="join-item btn btn-sm" disabled>
                                            <FaChevronLeft />
                                        </button>
                                        <button className="join-item btn btn-sm btn-primary">1</button>
                                        <button className="join-item btn btn-sm">2</button>
                                        <button className="join-item btn btn-sm">3</button>
                                        <span className="join-item btn btn-sm btn-disabled">...</span>
                                        <button className="join-item btn btn-sm">125</button>
                                        <button className="join-item btn btn-sm">
                                            <FaChevronRight />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col rounded-md border border-outline-variant shadow-md">
                <div className="flex justify-between items-center p-4">
                    <h3>Historial reciente</h3>
                    <Link href={"/liquidations/history"}><button className="btn btn-primary btn-outline">Ver todo</button></Link>
                </div>
                <table className="table rounded-t-sm rounded bg-surface-container-lowest">
                    <thead className="shadow-sm">
                        <tr className="text-black">
                            <th></th>
                            <th>Empleado</th>
                            <th>Fecha</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((emp) => (
                                <tr key={emp.id} className="shadow-sm">
                                    <td>
                                        <div className="avatar avatar-placeholder">
                                            <div className="bg-surface-container-lowest border border-primary text-(--on-primary-container) w-10 rounded-full">
                                                <span className="text-xl">{`${emp.name[0]}${emp.last_name[0]}`}</span>
                                            </div>
                                        </div>
                                    </td>

                                    <td>{emp.name + " " + emp.last_name}</td>
                                    <td>12/04/2026</td>
                                    <td>Bs. 1400</td>
                                    <td><div className={`badge badge-soft ${emp.estado?"badge-primary":"badge-warning"}`}>{emp.estado? "Procesada":"Sin procesar"}</div></td>
                                    <td><div className="tooltip" data-tip="Descargar"><button className="btn btn-primary btn-outline"><FaDownload className="text-lg"/></button></div></td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default LiquidationsPage;