'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ColumnConfig } from '@/types';

interface ColumnConfigPanelProps {
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => Promise<void>;
}

export function ColumnConfigPanel({ columns, onSave }: ColumnConfigPanelProps) {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleVisible = (key: string) => {
    setLocalColumns(
      localColumns.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleLabelChange = (key: string, label: string) => {
    setLocalColumns(
      localColumns.map((col) => (col.key === key ? { ...col, label } : col))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newColumns = [...localColumns];
    [newColumns[index - 1], newColumns[index]] = [
      newColumns[index],
      newColumns[index - 1],
    ];
    // Update order values
    newColumns.forEach((col, i) => {
      col.order = i;
    });
    setLocalColumns(newColumns);
  };

  const handleMoveDown = (index: number) => {
    if (index === localColumns.length - 1) return;
    const newColumns = [...localColumns];
    [newColumns[index], newColumns[index + 1]] = [
      newColumns[index + 1],
      newColumns[index],
    ];
    // Update order values
    newColumns.forEach((col, i) => {
      col.order = i;
    });
    setLocalColumns(newColumns);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localColumns);
    } catch (error) {
      console.error('Error al guardar configuración:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Configuración de Columnas
        </h3>
        <div className="space-y-3">
          {localColumns.map((column, index) => (
            <div
              key={column.key}
              className="p-3 border border-gray-200 rounded-md space-y-2"
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${column.key}`}
                  checked={column.visible}
                  onCheckedChange={() => handleToggleVisible(column.key)}
                />
                <Label
                  htmlFor={`col-${column.key}`}
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {column.key}
                </Label>
              </div>

              <div>
                <Label htmlFor={`label-${column.key}`} className="text-xs text-gray-600">
                  Label visible
                </Label>
                <Input
                  id={`label-${column.key}`}
                  value={column.label}
                  onChange={(e) => handleLabelChange(column.key, e.target.value)}
                  className="mt-1 h-8 text-sm"
                />
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Mover arriba"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === localColumns.length - 1}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Mover abajo"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  );
}
