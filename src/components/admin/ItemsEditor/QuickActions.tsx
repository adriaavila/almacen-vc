'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface QuickActionsProps {
  onCreateNew: () => void;
  showOnlyActive: boolean;
  onToggleShowOnlyActive: (value: boolean) => void;
}

export function QuickActions({
  onCreateNew,
  showOnlyActive,
  onToggleShowOnlyActive,
}: QuickActionsProps) {

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Acciones Rápidas
        </h3>
        <Button
          variant="primary"
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear nuevo item
        </Button>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="showOnlyActive"
            checked={showOnlyActive}
            onCheckedChange={(checked) => onToggleShowOnlyActive(checked as boolean)}
            className="border-gray-300"
          />
          <Label htmlFor="showOnlyActive" className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Solo activos
          </Label>
        </div>
      </div>

    </div>
  );
}
