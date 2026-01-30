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
    <div className="w-full overflow-hidden bg-white border-t border-gray-200 py-1 sm:py-1.5 md:py-2">
      <div className="flex items-center gap-2 mb-1 sm:mb-1.5 px-1 overflow-x-auto scrollbar-hide">
        <p className="text-xs sm:text-sm font-medium text-gray-700 shrink-0">
          Cliente / Paciente
        </p>
        <div className="flex gap-1.5 shrink-0">
          {['Interno', 'Casas', 'Mantenimiento'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(current => current === status ? null : status)}
              className={`
                px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border transition-colors
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
      <div
        className="flex gap-2 sm:gap-2.5 overflow-x-auto scrollbar-hide pb-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filteredPacientes.map((paciente) => {
          const isActive = paciente.id === activeSlotPacienteId;
          return (
            <button
              key={paciente.id}
              type="button"
              onClick={() => onPacienteChange(paciente.id)}
              className={`
                shrink-0 rounded-full px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-semibold
                transition-all duration-200
                ${isActive
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                }
              `}
            >
              {paciente.nombre}
            </button>
          );
        })}
        {filteredPacientes.length === 0 && (
          <div className="text-gray-400 text-xs px-2 py-1.5 italic">
            No se encontraron pacientes en esta categoría
          </div>
        )}
      </div>
    </div>
  );
}
