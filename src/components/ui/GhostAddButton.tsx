'use client';

import { useState, useEffect } from 'react';

interface GhostAddButtonProps {
  slotId: number;
  onClick: () => void;
  disabled?: boolean;
  showFeedback?: boolean;
  /** Use "compact" when inside a slot card */
  size?: 'default' | 'compact';
}

export function GhostAddButton({ slotId, onClick, disabled, showFeedback, size = 'default' }: GhostAddButtonProps) {
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

  const isCompact = size === 'compact';
  return (
    <div className="relative flex items-center justify-center">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          rounded-lg sm:rounded-xl flex items-center justify-center
          transition-all duration-200
          ${isCompact
            ? 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10'
            : 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24'
          }
          ${disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-95 shadow-md'
          }
          ${ripple ? 'ring-2 ring-emerald-300 ring-opacity-50' : ''}
        `}
        aria-label="Agregar café"
      >
        <span className={isCompact ? 'text-base sm:text-lg md:text-xl' : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'}>☕</span>
      </button>

    </div>
  );
}
