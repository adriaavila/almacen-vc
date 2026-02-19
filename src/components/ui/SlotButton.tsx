'use client';

import { useEffect, useState } from 'react';
import { GhostAddButton } from '@/components/ui/GhostAddButton';

interface SlotButtonProps {
  slotNumber: number;
  isActive: boolean;
  itemCount: number;
  onClick: () => void;
  showRipple?: boolean;
  /** Add coffee to this slot; when provided, coffee button is rendered inside the card */
  onCoffeeClick?: () => void;
  showCoffeeFeedback?: boolean;
  disabledCoffee?: boolean;
}

export function SlotButton({
  slotNumber,
  isActive,
  itemCount,
  onClick,
  showRipple,
  onCoffeeClick,
  showCoffeeFeedback,
  disabledCoffee,
}: SlotButtonProps) {
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
      <div
        className={`
          relative w-16 sm:w-20 md:w-24 lg:w-24 xl:w-28 rounded-lg sm:rounded-xl shadow-sm border flex flex-col items-center
          transition-all duration-300 overflow-hidden group
          ${isActive
            ? 'bg-slate-900 border-transparent shadow-xl scale-[1.02]'
            : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow'
          }
          ${ripple ? 'animate-pulse' : ''}
        `}
      >
        {/* Border Beam Effect (visible only when active) */}
        {isActive && (
          <>
            <div
              className="absolute inset-[-100%] animate-[spin_4s_linear_infinite] opacity-100"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0 340deg, #10b981 360deg)'
              }}
            />
            {/* Inner mask to create the border effect (slighly smaller than parent) */}
            <div className="absolute inset-[1.5px] bg-slate-900 rounded-[calc(inherit-1.5px)] z-0" />
          </>
        )}

        <button
          type="button"
          onClick={onClick}
          className={`relative z-10 w-full flex flex-col items-center pt-2 sm:pt-2.5 md:pt-3 pb-1 sm:pb-1.5 ${isActive ? 'text-white' : 'text-gray-700'}`}
          aria-label={`Slot ${slotNumber}`}
        >
          <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
            Slot {slotNumber}
          </span>
          <span className={`text-base sm:text-lg md:text-xl font-black mt-0.5 sm:mt-1 ${isActive ? 'text-white' : 'text-gray-900'}`}>
            {itemCount > 0 ? itemCount : '—'}
          </span>

        </button>
        {onCoffeeClick != null && (
          <div className="relative z-10 w-full flex justify-center pb-2 sm:pb-2.5 md:pb-3 pt-0.5">
            <GhostAddButton
              slotId={slotNumber}
              onClick={onCoffeeClick}
              disabled={disabledCoffee}
              showFeedback={showCoffeeFeedback ?? false}
              size="compact"
            />
          </div>
        )}
      </div>
    </div>
  );
}
