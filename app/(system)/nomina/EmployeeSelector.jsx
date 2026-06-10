"use client";

import React, { useState, useMemo, useEffect } from "react";
import { BiSearch } from "react-icons/bi";

export default function EmployeeSelector({ employees, onSelectionChange, initialSelected = [], singleSelect = false }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Sync selectedIds when initialSelected changes (e.g., loading assigned employees in edit mode)
  useEffect(() => {
    setSelectedIds(initialSelected || []);
  }, [initialSelected]);

  // When singleSelect mode is enabled, enforce single selection
  useEffect(() => {
    if (singleSelect && selectedIds.length > 1) {
      const newSelection = [selectedIds[0]];
      setSelectedIds(newSelection);
      onSelectionChange(newSelection);
    }
  }, [singleSelect]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toString().includes(searchTerm)
    );
  }, [employees, searchTerm]);

  const handleToggle = (id) => {
    let newSelection;
    if (singleSelect) {
      newSelection = selectedIds.includes(id) ? [] : [id];
    } else {
      newSelection = selectedIds.includes(id)
        ? selectedIds.filter(item => item !== id)
        : [...selectedIds, id];
    }

    setSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredEmployees.map(e => e.id);
    const newSelection = selectedIds.length === allFilteredIds.length ? [] : allFilteredIds;
    setSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <BiSearch className="absolute left-3 top-3 text-on-surface-variant text-lg" />
        <input
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant bg-surface-bright text-body-md focus:ring-2 focus:ring-primary/20 outline-none"
          placeholder="Buscar empleado por nombre o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-bright">
        <div className="bg-surface-container-low p-2 px-4 border-b border-outline-variant flex justify-between items-center">
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
            {selectedIds.length} {singleSelect ? "seleccionado" : "seleccionados"}
          </span>
          {!singleSelect && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-primary font-label-sm text-label-sm hover:underline"
            >
              {selectedIds.length === filteredEmployees.length ? "Desmarcar todos" : "Marcar todos"}
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredEmployees.map((emp) => (
            <label 
              key={emp.id} 
              className={`flex items-center gap-4 p-3 px-4 hover:bg-surface-container cursor-pointer transition-colors border-b border-outline-variant/30 last:border-0 ${selectedIds.includes(emp.id) ? 'bg-primary/5' : ''}`}
            >
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-outline-variant text-primary"
                checked={selectedIds.includes(emp.id)}
                onChange={() => handleToggle(emp.id)}
              />
              <div className="text-body-md font-medium text-on-surface">{emp.name}</div>
              <div className="text-body-sm text-on-surface-variant ml-auto">ID: {emp.id}</div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}