'use client';

import { Badge } from '@/components/ui/Badge';

interface StatusCellProps {
  status: 'ok' | 'bajo_stock';
  className?: string;
}

export function StatusCell({ status, className }: StatusCellProps) {
  const isLowStock = status === 'bajo_stock';

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <div
        className={`h-2.5 w-2.5 rounded-full animate-pulse ${
          isLowStock ? 'bg-red-500' : 'bg-emerald-500'
        }`}
      />
      <Badge variant={isLowStock ? 'bajo-minimo' : 'ok'}>
        {isLowStock ? 'Bajo Stock' : 'OK'}
      </Badge>
    </div>
  );
}
