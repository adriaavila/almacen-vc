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
          transition-all duration-200 overflow-hidden
          ${isActive
            ? 'bg-white border-emerald-500 ring-2 ring-emerald-200 shadow-md'
            : 'bg-white border-gray-200 hover:border-emerald-300 hover:shadow'
          }
          ${ripple ? 'animate-pulse' : ''}
        `}
      >
        <button
          type="button"
          onClick={onClick}
          className="w-full flex flex-col items-center pt-2 sm:pt-2.5 md:pt-3 pb-1 sm:pb-1.5"
          aria-label={`Slot ${slotNumber}`}
        >
          <span className="text-xs sm:text-sm font-semibold text-gray-700">
            Slot {slotNumber}
          </span>
          <span className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-0.5 sm:mt-1">
            {itemCount > 0 ? itemCount : '—'}
          </span>
          {itemCount > 0 && (
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
        {onCoffeeClick != null && (
          <div className="w-full flex justify-center pb-2 sm:pb-2.5 md:pb-3 pt-0.5">
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
