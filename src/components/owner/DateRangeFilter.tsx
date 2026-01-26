'use client';

import { Button } from '@/components/ui/Button';

export type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const ranges: { value: DateRange; label: string }[] = [
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 90 días' },
    { value: '1y', label: 'Último año' },
    { value: 'all', label: 'Todo' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-row gap-2">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`w-full lg:w-auto px-3 py-2.5 sm:px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
            value === range.value
              ? 'bg-emerald-600 text-white shadow-md scale-105'
              : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export function getDateRangeTimestamps(range: DateRange): { startDate?: number; endDate?: number } {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  switch (range) {
    case '7d':
      return { startDate: now - 7 * oneDay, endDate: now };
    case '30d':
      return { startDate: now - 30 * oneDay, endDate: now };
    case '90d':
      return { startDate: now - 90 * oneDay, endDate: now };
    case '1y':
      return { startDate: now - 365 * oneDay, endDate: now };
    case 'all':
      return {};
    default:
      return { startDate: now - 30 * oneDay, endDate: now };
  }
}
