'use client';

import { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface ColumnHeaderFilterProps {
  columnKey: string;
  filterType: 'dropdown' | 'text' | 'number-range';
  options?: string[];
  value: string | string[] | { min?: number; max?: number } | undefined;
  onChange: (value: string | string[] | { min?: number; max?: number } | undefined) => void;
  placeholder?: string;
}

export function ColumnHeaderFilter({
  columnKey,
  filterType,
  options = [],
  value,
  onChange,
  placeholder,
}: ColumnHeaderFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [textValue, setTextValue] = useState<string>('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filterType === 'text' && typeof value === 'string') {
      setTextValue(value);
    } else if (filterType === 'number-range' && value && typeof value === 'object' && 'min' in value) {
      setMinValue(value.min?.toString() || '');
      setMaxValue(value.max?.toString() || '');
    }
  }, [value, filterType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasActiveFilter = value !== undefined && value !== null && 
    (typeof value === 'string' ? value.trim() !== '' : 
     Array.isArray(value) ? value.length > 0 :
     typeof value === 'object' && (value.min !== undefined || value.max !== undefined));

  const handleTextChange = (newValue: string) => {
    setTextValue(newValue);
    onChange(newValue.trim() || undefined);
  };

  const handleRangeChange = (type: 'min' | 'max', newValue: string) => {
    const numValue = newValue === '' ? undefined : parseFloat(newValue);
    
    if (type === 'min') {
      setMinValue(newValue);
      const currentRange = (value && typeof value === 'object' && 'min' in value) 
        ? { ...(value as { min?: number; max?: number }) }
        : {};
      onChange({ ...currentRange, min: numValue });
    } else {
      setMaxValue(newValue);
      const currentRange = (value && typeof value === 'object' && 'min' in value)
        ? { ...(value as { min?: number; max?: number }) }
        : {};
      onChange({ ...currentRange, max: numValue });
    }
  };

  const handleMultiSelect = (option: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = checked
      ? [...currentValues, option]
      : currentValues.filter((v) => v !== option);
    onChange(newValues.length > 0 ? newValues : undefined);
  };

  const handleSingleSelect = (selectedValue: string) => {
    onChange(selectedValue || undefined);
  };

  const clearFilter = () => {
    onChange(undefined);
    setTextValue('');
    setMinValue('');
    setMaxValue('');
  };

  if (filterType === 'text') {
    return (
      <div className="relative mt-1" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={placeholder || 'Buscar...'}
            className={`w-full h-7 px-2 pr-7 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 ${
              hasActiveFilter ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
            }`}
          />
          {hasActiveFilter && (
            <button
              onClick={clearFilter}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
              title="Limpiar filtro"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (filterType === 'number-range') {
    return (
      <div className="relative mt-1 space-y-1" ref={dropdownRef}>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={minValue}
            onChange={(e) => handleRangeChange('min', e.target.value)}
            placeholder="Min"
            className={`h-7 px-2 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              hasActiveFilter ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
            }`}
          />
          <span className="text-xs text-gray-500">-</span>
          <Input
            type="number"
            value={maxValue}
            onChange={(e) => handleRangeChange('max', e.target.value)}
            placeholder="Max"
            className={`h-7 px-2 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
              hasActiveFilter ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300'
            }`}
          />
        </div>
        {hasActiveFilter && (
          <button
            onClick={clearFilter}
            className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
            title="Limpiar filtro"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </div>
    );
  }

  // Dropdown filter
  return (
    <div className="relative mt-1" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-7 px-2 text-xs border rounded-md flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
          hasActiveFilter
            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        }`}
        title={hasActiveFilter ? 'Filtro activo - Click para ver opciones' : 'Click para filtrar'}
      >
        <span className="truncate flex-1 text-left">
          {Array.isArray(value) && value.length > 0
            ? `${value.length} seleccionado${value.length > 1 ? 's' : ''}`
            : typeof value === 'string' && value
            ? value
            : placeholder || 'Todos'}
        </span>
        <div className="flex items-center gap-1">
          {hasActiveFilter && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          )}
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 space-y-1">
            {options.length > 0 ? (
              <>
                {typeof value === 'string' ? (
                  // Single select
                  options.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        handleSingleSelect(option === value ? '' : option);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-100 flex items-center gap-2 ${
                        value === option ? 'bg-emerald-50 text-emerald-900' : ''
                      }`}
                    >
                      <svg
                        className={`w-3 h-3 ${value === option ? 'text-emerald-600' : 'text-transparent'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {option}
                    </button>
                  ))
                ) : (
                  // Multi select
                  <>
                    {options.map((option) => {
                      const isSelected = Array.isArray(value) && value.includes(option);
                      return (
                        <label
                          key={option}
                          className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-gray-100 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleMultiSelect(option, e.target.checked)}
                            className="w-3 h-3 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className={isSelected ? 'text-emerald-900 font-medium' : ''}>{option}</span>
                        </label>
                      );
                    })}
                  </>
                )}
                {hasActiveFilter && (
                  <button
                    onClick={clearFilter}
                    className="w-full mt-2 pt-2 border-t border-gray-200 text-xs text-red-600 hover:text-red-800 flex items-center justify-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar filtro
                  </button>
                )}
              </>
            ) : (
              <div className="px-2 py-2 text-xs text-gray-500">No hay opciones</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
