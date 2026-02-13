'use client';

import { useState } from 'react';

import { Paciente } from '@/types';

interface PatientSliderProps {
  pacientes: Paciente[];
  activeSlotPacienteId: string | null;
  onPacienteChange: (pacienteId: string) => void;
}

export function PatientSlider({ pacientes, activeSlotPacienteId, onPacienteChange }: PatientSliderProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const filteredPacientes = filter
    ? pacientes.filter(p => p.estado === filter)
    : pacientes;

  return (
    <div className="w-full overflow-hidden">
      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-1.5 flex-wrap">
          {['Interno', 'Casas', 'Mantenimiento'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(current => current === status ? null : status)}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
                ${filter === status
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }
              `}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Patient grid - wrapping layout to show all/most on screen */}
      <div
        className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-hide"
      >
        {filteredPacientes.map((paciente) => {
          const isActive = paciente.id === activeSlotPacienteId;
          return (
            <button
              key={paciente.id}
              type="button"
              onClick={() => onPacienteChange(paciente.id)}
              className={`
                rounded-lg px-2.5 py-1.5 text-xs font-medium
                transition-all duration-150
                ${isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                }
              `}
            >
              {paciente.nombre}
            </button>
          );
        })}
        {filteredPacientes.length === 0 && (
          <div className="text-gray-400 text-xs px-2 py-1.5 italic">
            No se encontraron pacientes
          </div>
        )}
      </div>
    </div>
  );
}
