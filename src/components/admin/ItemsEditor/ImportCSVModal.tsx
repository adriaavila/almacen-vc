'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; field?: string; message: string }>;
}

interface ImportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  isImporting: boolean;
  result: ImportResult | null;
}

export function ImportCSVModal({
  isOpen,
  onClose,
  isImporting,
  result,
}: ImportCSVModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={result ? 'Resultado de Importación' : 'Importar Items desde CSV'}
    >
      {isImporting ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
              <p className="text-gray-600">Importando items...</p>
            </div>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="text-sm font-medium text-gray-700">Total de filas procesadas:</span>
              <span className="text-sm font-semibold text-gray-900">{result.totalRows}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
              <span className="text-sm font-medium text-gray-700">Items creados:</span>
              <span className="text-sm font-semibold text-green-600">{result.created}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
              <span className="text-sm font-medium text-gray-700">Items actualizados:</span>
              <span className="text-sm font-semibold text-blue-600">{result.updated}</span>
            </div>
            {result.errors.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">Errores:</span>
                <span className="text-sm font-semibold text-red-600">{result.errors.length}</span>
              </div>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 text-center">Detalles de errores:</h3>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="primary"
              onClick={onClose}
              className="px-4 py-2"
            >
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona un archivo CSV para importar productos. El archivo puede usar el formato nuevo o el formato legacy.
          </p>
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            <p><strong>Formato nuevo:</strong> name, brand, category, subCategory, baseUnit, purchaseUnit, conversionFactor, active, stockAlmacen, stockCafetin, stockMinimoAlmacen, stockMinimoCafetin</p>
            <p><strong>Formato legacy:</strong> nombre, categoria, subcategoria, marca, unidad, stock_actual, stock_minimo, location</p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={onClose}
              className="px-4 py-2"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
