'use client';

import { useState, useEffect } from 'react';

interface GhostAddButtonProps {
  slotId: number;
  onClick: () => void;
  disabled?: boolean;
  showFeedback?: boolean;
}

export function GhostAddButton({ slotId, onClick, disabled, showFeedback }: GhostAddButtonProps) {
  const [ripple, setRipple] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    if (showFeedback) {
      setRipple(true);
      setShowBadge(true);
      const rippleTimer = setTimeout(() => setRipple(false), 600);
      const badgeTimer = setTimeout(() => setShowBadge(false), 2000);
      return () => {
        clearTimeout(rippleTimer);
        clearTimeout(badgeTimer);
      };
    }
  }, [showFeedback]);

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 rounded-lg sm:rounded-xl flex items-center justify-center
          transition-all duration-200
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:scale-105 sm:hover:scale-110 active:scale-95 shadow-md'
          }
          ${ripple ? 'ring-2 sm:ring-3 md:ring-4 lg:ring-5 ring-emerald-300 ring-opacity-50' : ''}
        `}
        aria-label="Agregar café"
      >
        <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">☕</span>
      </button>
      {showBadge && (
        <span className="absolute -top-1 -right-1 sm:-top-1 sm:-right-1 md:-top-1.5 md:-right-1.5 lg:-top-2 lg:-right-2 bg-emerald-500 text-white text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-base font-bold px-1 sm:px-1 md:px-1.5 lg:px-2 py-0.5 sm:py-0.5 md:py-1 rounded-full animate-bounce">
          +1
        </span>
      )}
    </div>
  );
}
