import React, { useState, useEffect } from 'react';
import { pluralizeUnit } from '@/lib/utils';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  suggested?: boolean;
  itemId?: string;
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max,
  unit,
  suggested = false,
  itemId,
}: QuantityInputProps) {
  const [displayValue, setDisplayValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Sync display value when prop value changes (but not while user is typing)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value.toString());
    }
  }, [value, isFocused]);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
    setDisplayValue(newValue.toString());
  };

  const handleIncrement = () => {
    const newValue = max !== undefined ? Math.min(max, value + 1) : value + 1;
    onChange(newValue);
    setDisplayValue(newValue.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    
    // Allow empty input or just a dot while typing
    if (inputValue === '' || inputValue === '.' || inputValue === '-') {
      return;
    }
    
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      return;
    }
    
    let newValue = Math.max(min, numValue);
    if (max !== undefined) {
      newValue = Math.min(max, newValue);
    }
    onChange(newValue);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Ensure display value matches the actual value on blur
    // If the input was invalid, it will be corrected to the current value
    setDisplayValue(value.toString());
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors shadow-sm"
        aria-label="Decrementar cantidad"
      >
        –
      </button>
      <div className="flex flex-col items-center gap-0.5">
        <input
          type="number"
          id={itemId ? `qty-${itemId}` : undefined}
          min={min}
          max={max}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          step="0.1"
          className="w-16 h-10 px-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base font-semibold"
        />
        {unit && (
          <span className="text-[10px] text-gray-500 leading-tight">{pluralizeUnit(unit, value)}</span>
        )}
        {suggested && (
          <span className="text-[10px] text-gray-400 leading-tight">← sugerido</span>
        )}
      </div>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={max !== undefined && value >= max}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors shadow-sm"
        aria-label="Incrementar cantidad"
      >
        +
      </button>
    </div>
  );
}
