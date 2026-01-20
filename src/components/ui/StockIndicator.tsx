import React from 'react';
import { StockStatus } from '@/types';

interface StockIndicatorProps {
  stock_actual: number;
  stock_minimo: number;
}

export function StockIndicator({ stock_actual, stock_minimo }: StockIndicatorProps) {
  const getStockStatus = (): StockStatus => {
    if (stock_actual <= stock_minimo) {
      return 'low';
    } else if (stock_actual <= stock_minimo * 1.5) {
      return 'just_enough';
    }
    return 'sufficient';
  };

  const status = getStockStatus();

  const statusConfig = {
    sufficient: {
      label: 'Suficiente',
      className: 'bg-emerald-100 text-emerald-800',
    },
    just_enough: {
      label: 'Justo',
      className: 'bg-yellow-100 text-yellow-800',
    },
    low: {
      label: 'Bajo',
      className: 'bg-red-100 text-red-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
