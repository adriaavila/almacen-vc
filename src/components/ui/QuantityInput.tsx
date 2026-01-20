import React from 'react';

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
  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = max !== undefined ? Math.min(max, value + 1) : value + 1;
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value, 10) || 0;
    let newValue = Math.max(min, numValue);
    if (max !== undefined) {
      newValue = Math.min(max, newValue);
    }
    onChange(newValue);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-14 h-14 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-2xl transition-colors shadow-sm"
        aria-label="Decrementar cantidad"
      >
        –
      </button>
      <div className="flex flex-col items-center gap-1">
        <input
          type="number"
          id={itemId ? `qty-${itemId}` : undefined}
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          step="1"
          className="w-20 h-12 px-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xl font-semibold"
        />
        {unit && (
          <span className="text-xs text-gray-500">{unit}</span>
        )}
        {suggested && (
          <span className="text-xs text-gray-400">← sugerido</span>
        )}
      </div>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={max !== undefined && value >= max}
        className="w-14 h-14 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-2xl transition-colors shadow-sm"
        aria-label="Incrementar cantidad"
      >
        +
      </button>
    </div>
  );
}
