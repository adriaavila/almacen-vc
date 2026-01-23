'use client';

import { useEffect, useState } from 'react';

interface SlotButtonProps {
  slotNumber: number;
  isActive: boolean;
  itemCount: number;
  onClick: () => void;
  showRipple?: boolean;
}

export function SlotButton({ slotNumber, isActive, itemCount, onClick, showRipple }: SlotButtonProps) {
  const [ripple, setRipple] = useState(false);

  useEffect(() => {
    if (showRipple) {
      setRipple(true);
      const timer = setTimeout(() => setRipple(false), 600);
      return () => clearTimeout(timer);
    }
  }, [showRipple]);

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={onClick}
        className={`
          relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-full flex items-center justify-center
          font-bold text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl transition-all duration-200
          ${isActive 
            ? 'bg-emerald-500 text-white shadow-lg sm:shadow-xl ring-2 sm:ring-3 md:ring-4 lg:ring-5 ring-emerald-200 scale-105 sm:scale-110' 
            : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
          }
          ${ripple ? 'animate-pulse' : ''}
        `}
      >
        {slotNumber}
        {itemCount > 0 && (
          <span className={`
            absolute -top-1 -right-1 sm:-top-1 sm:-right-1 md:-top-1.5 md:-right-1.5 lg:-top-2 lg:-right-2 min-w-[16px] sm:min-w-[18px] md:min-w-[20px] lg:min-w-[24px] xl:min-w-[28px] h-4 sm:h-4.5 md:h-5 lg:h-6 xl:h-7 px-1 sm:px-1 md:px-1.5 lg:px-2 rounded-full text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-bold
            flex items-center justify-center
            ${isActive 
              ? 'bg-white text-emerald-600' 
              : 'bg-emerald-500 text-white'
            }
          `}>
            {itemCount}
          </span>
        )}
      </button>
    </div>
  );
}
