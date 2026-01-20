'use client';

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
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Acciones Rápidas</h3>
        <Button
          variant="primary"
          onClick={onCreateNew}
          className="w-full"
        >
          Crear nuevo item
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showOnlyActive"
            checked={showOnlyActive}
            onCheckedChange={(checked) => onToggleShowOnlyActive(checked as boolean)}
          />
          <Label htmlFor="showOnlyActive" className="cursor-pointer text-sm">
            Solo activos
          </Label>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Importar items</p>
        <Button variant="secondary" className="w-full" disabled>
          Importar (próximamente)
        </Button>
      </div>
    </div>
  );
}
