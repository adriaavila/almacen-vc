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
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Configuración de Columnas
        </h3>
        <div className="space-y-3 max-h-[calc(100vh-450px)] overflow-y-auto pr-2">
          {localColumns.map((column, index) => (
            <div
              key={column.key}
              className="p-3 border border-gray-200 rounded-lg bg-white hover:border-emerald-300 transition-colors space-y-3"
            >
              <div className="flex items-center space-x-3">
                <Checkbox
                  id={`col-${column.key}`}
                  checked={column.visible}
                  onCheckedChange={() => handleToggleVisible(column.key)}
                  className="border-gray-300"
                />
                <Label
                  htmlFor={`col-${column.key}`}
                  className="flex-1 cursor-pointer text-sm font-medium text-gray-700"
                >
                  {column.key}
                </Label>
              </div>

              <div>
                <Label htmlFor={`label-${column.key}`} className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Label visible
                </Label>
                <Input
                  id={`label-${column.key}`}
                  value={column.label}
                  onChange={(e) => handleLabelChange(column.key, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="flex-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors flex items-center justify-center gap-1"
                  title="Mover arriba"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Arriba
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === localColumns.length - 1}
                  className="flex-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors flex items-center justify-center gap-1"
                  title="Mover abajo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Abajo
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
        className="w-full flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
      >
        {isSaving ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Guardando...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Guardar configuración
          </>
        )}
      </Button>
    </div>
  );
}
