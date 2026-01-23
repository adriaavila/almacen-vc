'use client';

import { useEffect, useRef, useState } from 'react';
import { Paciente } from '@/types';

interface PatientSliderProps {
  pacientes: Paciente[];
  activeSlotPacienteId: string | null;
  onPacienteChange: (pacienteId: string) => void;
}

export function PatientSlider({ pacientes, activeSlotPacienteId, onPacienteChange }: PatientSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find index of active paciente and scroll to it when slot changes
  useEffect(() => {
    if (sliderRef.current && !isScrolling) {
      if (activeSlotPacienteId) {
        const index = pacientes.findIndex(p => p.id === activeSlotPacienteId);
        if (index !== -1) {
          const scrollPosition = index * sliderRef.current.clientWidth;
          sliderRef.current.scrollTo({
            left: scrollPosition,
            behavior: 'smooth',
          });
        }
      } else {
        // If no paciente assigned, scroll to first paciente but don't assign it yet
        sliderRef.current.scrollTo({
          left: 0,
          behavior: 'smooth',
        });
      }
    }
  }, [activeSlotPacienteId, pacientes, isScrolling]);

  const handleScroll = () => {
    if (!sliderRef.current) return;
    
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set new timeout to detect when scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      
      if (!sliderRef.current) return;
      
      const scrollLeft = sliderRef.current.scrollLeft;
      const itemWidth = sliderRef.current.clientWidth;
      const newIndex = Math.round(scrollLeft / itemWidth);
      
      if (newIndex >= 0 && newIndex < pacientes.length) {
        onPacienteChange(pacientes[newIndex].id);
      }
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const activeIndex = pacientes.findIndex(p => p.id === activeSlotPacienteId);
  const currentIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="w-full h-full overflow-hidden bg-white border-t border-gray-200 relative">
      {/* Indicadores de posición */}
      <div className="absolute top-0.5 sm:top-1 md:top-1.5 left-1/2 transform -translate-x-1/2 flex gap-0.5 sm:gap-1 md:gap-1.5 z-10">
        {pacientes.map((_, index) => (
          <div
            key={index}
            className={`h-0.5 sm:h-1 md:h-1.5 rounded-full transition-all ${
              index === currentIndex 
                ? 'w-3 sm:w-4 md:w-5 lg:w-6 bg-emerald-500' 
                : 'w-0.5 sm:w-1 md:w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>

      <div
        ref={sliderRef}
        onScroll={handleScroll}
        className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {pacientes.map((paciente) => {
          const isActive = paciente.id === activeSlotPacienteId;
          return (
            <div
              key={paciente.id}
              className="shrink-0 w-full h-full flex items-center justify-center snap-start"
            >
              <div className={`text-center px-1 sm:px-2 md:px-4 lg:px-6 xl:px-8 transition-all ${
                isActive ? 'scale-105 sm:scale-110' : 'scale-100'
              }`}>
                <h2 className={`text-xs sm:text-sm md:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold transition-colors line-clamp-2 ${
                  isActive ? 'text-emerald-600' : 'text-gray-700'
                }`}>
                  {paciente.nombre}
                </h2>
                {isActive && (
                  <div className="mt-0.5 sm:mt-0.5 md:mt-1 lg:mt-1.5 h-0.5 sm:h-0.5 md:h-1 bg-emerald-500 w-6 sm:w-8 md:w-12 lg:w-16 xl:w-20 mx-auto rounded-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
