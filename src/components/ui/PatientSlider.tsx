'use client';

import { Paciente } from '@/types';

interface PatientSliderProps {
  pacientes: Paciente[];
  activeSlotPacienteId: string | null;
  onPacienteChange: (pacienteId: string) => void;
}

export function PatientSlider({ pacientes, activeSlotPacienteId, onPacienteChange }: PatientSliderProps) {
  return (
    <div className="w-full overflow-hidden bg-white border-t border-gray-200 py-1 sm:py-1.5 md:py-2">
      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 px-1">
        Cliente / Paciente
      </p>
      <div
        className="flex gap-2 sm:gap-2.5 overflow-x-auto scrollbar-hide pb-0.5"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {pacientes.map((paciente) => {
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
      </div>
    </div>
  );
}
