'use client';

import Link from "next/link";
import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { HiDotsVertical } from "react-icons/hi";
import { IoArrowBack, IoReturnUpBack } from "react-icons/io5";

const LiquidationHistory = () => {
    const [statusFilter, setStatusFilter] = useState("");
    const [inputValue, setInputValue] = useState("")

    const data = [
        {
            'id':1,
            'name':'Juan',
            'last_name':'Perez',
            'date': 30785932,
            'monto': "1500",
            'estado': 0
        },
        {
            'id':2,
            'name':'Maria',
            'last_name':'Gomez',
            'date': 28743721,
            'monto': "8000",
            'estado': 0
        },
        {
            'id':3,
            'name':'Pedro',
            'last_name':'Rodriguez',
            'date': 8943526,
            'monto': "3402",
            'estado': 1
        },
    ]

    const filteredData = data.filter((emp) => {
        const matchesSearch =
            inputValue === "" ||
            `${emp.name}`.toLowerCase().includes(inputValue.toLowerCase()) ||
            `${emp.last_name}`.toLowerCase().includes(inputValue.toLowerCase())
    
        const matchesStatus =
            statusFilter === "" ||
            emp.estado.toString() === statusFilter;
    
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col">
            <div className="mb-4 flex gap-2 items-center">
                <Link href={'/liquidations'}><button className="btn btn-error"><IoArrowBack className="text-2xl"/></button></Link>
                <h2>Historial de liquidaciones</h2>
            </div>

            <div className="flex flex-col mt-4 shadow-md rounded-md border border-outline-variant">
                <div className="flex px-4 py-2 justify-between items-center bg-(--surface-container-low) rounded-md">
                    <label className="input focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                        <FaSearch />
                        <input type="search" className="bg-surface-container-lowest" placeholder="Buscar por titulo o rango" value={inputValue} onChange={(e) => setInputValue(e.target.value)}/>
                    </label>

                    <div className="flex gap-2">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select focus-within:outline-1 focus-within:outline-outline-variant focus-within:ring-0 bg-surface-container-lowest border-outline-variant">
                            <option className="hover:bg-primary hover:text-on-primary whitespace-nowrap" value={""}>Todos los estados</option>
                            <option className="hover:bg-primary hover:text-on-primary" value={1}>Procesada</option>
                            <option className="hover:bg-primary hover:text-on-primary" value={0}>Sin procesar</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto bg-surface-container-lowest rounded-b-md ">
                    <table className="table shadow-sm rounded">
                        <thead className="shadow-sm">
                            <tr className="text-black">
                                <th></th>
                                <th>Empleado</th>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((emp) => (
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
                                        <td>
                                            <button className="btn btn-ghost btn-primary" popoverTarget={emp.id} style={{ anchorName: `--anchor-${emp.id}` } /* as React.CSSProperties */}>
                                                <HiDotsVertical className="text-xl"/>
                                            </button>

                                            <ul className="dropdown menu w-52 rounded-box bg-base-100 shadow-sm" popover="auto" id={emp.id} style={{ positionAnchor: `--anchor-${emp.id}`, positionArea: "bottom"} /* as React.CSSProperties */ }>
                                                <li className="hover:bg-primary hover:text-on-primary rounded-md"><a>Item 1</a></li>
                                                <li className="hover:bg-primary hover:text-on-primary rounded-md"><a>Item 2</a></li>
                                            </ul>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                <div className="card-body p-4 bg-base-200/50 border-t border-base-300">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-base-content/70">
                            Mostrando 1 a {filteredData.length} de{" "}
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
        </div>
    )
}

export default LiquidationHistory;