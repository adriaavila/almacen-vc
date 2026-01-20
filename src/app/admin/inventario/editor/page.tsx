'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Navbar } from '@/components/layout/Navbar';
import { ItemsTable } from '@/components/admin/ItemsEditor/ItemsTable';
import { ItemDrawer } from '@/components/admin/ItemsEditor/ItemDrawer';
import { ColumnConfigPanel } from '@/components/admin/ItemsEditor/ColumnConfigPanel';
import { QuickActions } from '@/components/admin/ItemsEditor/QuickActions';
import { Toast } from '@/components/ui/Toast';
import { ColumnConfig } from '@/types';

// Helper to safely check if uiConfig functions are available
// This checks if the module exists in the API without causing errors
function hasUiConfigFunctions(): boolean {
  try {
    // Check if uiConfig module exists and has the required functions
    // Use 'in' operator to safely check without triggering errors
    if (!('uiConfig' in api)) return false;
    const uiConfig = (api as any).uiConfig;
    if (!uiConfig) return false;
    if (typeof uiConfig.getConfig !== 'function') return false;
    if (typeof uiConfig.saveConfig !== 'function') return false;
    return true;
  } catch (error) {
    // If accessing api.uiConfig causes an error, it's not available
    return false;
  }
}

type ConvexItem = {
  _id: Id<"items">;
  nombre: string;
  categoria: string;
  subcategoria?: string;
  marca?: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  package_size?: string;
  location: string;
  extra_notes?: string;
  status: "ok" | "bajo_stock";
  active: boolean;
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'nombre', label: 'Nombre', visible: true, order: 0 },
  { key: 'categoria', label: 'Categoría', visible: true, order: 1 },
  { key: 'subcategoria', label: 'Subcategoría', visible: true, order: 2 },
  { key: 'marca', label: 'Marca', visible: true, order: 3 },
  { key: 'unidad', label: 'Unidad', visible: true, order: 4 },
  { key: 'stock_actual', label: 'Stock Actual', visible: true, order: 5 },
  { key: 'stock_minimo', label: 'Stock Mínimo', visible: true, order: 6 },
  { key: 'package_size', label: 'Tamaño Paquete', visible: true, order: 7 },
  { key: 'location', label: 'Ubicación', visible: true, order: 8 },
  { key: 'status', label: 'Estado', visible: true, order: 9 },
  { key: 'active', label: 'Activo', visible: true, order: 10 },
  { key: 'acciones', label: 'Acciones', visible: true, order: 11 },
];

export default function ItemsEditorPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConvexItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({ message: '', type: 'success', isOpen: false });

  const items = useQuery(api.items.list);
  const updateItem = useMutation(api.items.update);
  const createItem = useMutation(api.items.create);
  
  // Always start with 'skip' to prevent runtime errors
  // Only enable uiConfig when we're sure functions are synced
  // This prevents errors when Convex hasn't synced uiConfig.ts yet
  const [uiConfigAvailable, setUiConfigAvailable] = useState(false);
  
  // Always call hooks (React rules), but use 'skip' initially
  // This prevents runtime errors when Convex hasn't synced uiConfig.ts yet
  const config = useQuery(
    uiConfigAvailable ? api.uiConfig.getConfig : ('skip' as any),
    uiConfigAvailable ? { userId: 'admin', page: 'items_editor' } : ('skip' as any)
  );
  
  const saveConfig = useMutation(
    uiConfigAvailable ? api.uiConfig.saveConfig : ('skip' as any)
  );
  
  // Try to enable uiConfig after mount (when Convex might have synced)
  useEffect(() => {
    // Small delay to allow Convex to sync
    const timer = setTimeout(() => {
      try {
        if (hasUiConfigFunctions()) {
          setUiConfigAvailable(true);
        }
      } catch {
        // Functions not available, keep using defaults
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Check if screen is too small (hide editor on mobile and tablet)
  useEffect(() => {
    const checkScreenSize = () => {
      // Only show on desktop screens (>= 1280px for better UX)
      setIsMobile(window.innerWidth < 1280);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load config from Convex (only if available and not an error)
  useEffect(() => {
    if (config && config.columns && Array.isArray(config.columns)) {
      setColumns(config.columns);
      setShowOnlyActive(config.showOnlyActive);
    }
  }, [config]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const cats = Array.from(new Set(items.map((item) => item.categoria)));
    return cats.sort();
  }, [items]);

  // Get unique subcategories
  const subcategories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const subcats = Array.from(
      new Set(
        items
          .map((item) => item.subcategoria)
          .filter((sub): sub is string => Boolean(sub))
      )
    );
    return subcats.sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    let filtered = items;
    if (showOnlyActive) {
      filtered = filtered.filter((item) => item.active);
    }
    return filtered;
  }, [items, showOnlyActive]);

  const handleItemClick = (item: ConvexItem) => {
    setSelectedItem(item);
    setIsCreating(false);
    setIsDrawerOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedItem(null);
    setIsCreating(true);
    setIsDrawerOpen(true);
  };

  const handleFieldUpdate = async (
    itemId: Id<"items">,
    field: string,
    value: string | number | boolean | undefined
  ) => {
    try {
      // Validate required fields
      if (field === 'location' && (!value || (typeof value === 'string' && value.trim() === ''))) {
        setToast({
          message: 'La ubicación es requerida',
          type: 'error',
          isOpen: true,
        });
        throw new Error('Location is required');
      }

      if (field === 'nombre' && (!value || (typeof value === 'string' && value.trim() === ''))) {
        setToast({
          message: 'El nombre es requerido',
          type: 'error',
          isOpen: true,
        });
        throw new Error('Nombre is required');
      }

      // For optional fields, convert empty string to undefined
      const optionalFields = ['subcategoria', 'marca', 'package_size', 'extra_notes'];
      const finalValue = optionalFields.includes(field) && value === '' ? undefined : value;

      await updateItem({
        id: itemId,
        [field]: finalValue,
      });
      setToast({
        message: 'Campo actualizado correctamente',
        type: 'success',
        isOpen: true,
      });
    } catch (error) {
      console.error('Error al actualizar campo:', error);
      if (!(error instanceof Error && error.message.includes('required'))) {
        setToast({
          message: 'Error al actualizar campo',
          type: 'error',
          isOpen: true,
        });
      }
      throw error;
    }
  };

  const handleSaveItem = async (
    itemId: Id<"items"> | null,
    data: Partial<ConvexItem>
  ) => {
    try {
      if (itemId) {
        // Update existing item
        await updateItem({
          id: itemId,
          ...data,
        });
        setToast({
          message: 'Item actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
      } else {
        // Create new item
        await createItem({
          nombre: data.nombre!,
          categoria: data.categoria!,
          subcategoria: data.subcategoria,
          marca: data.marca,
          unidad: data.unidad!,
          stock_actual: data.stock_actual!,
          stock_minimo: data.stock_minimo!,
          package_size: data.package_size,
          location: data.location || 'Almacén Principal',
          extra_notes: data.extra_notes,
          active: data.active ?? true,
        });
        setToast({
          message: 'Item creado correctamente',
          type: 'success',
          isOpen: true,
        });
      }
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error al guardar item:', error);
      setToast({
        message: 'Error al guardar item',
        type: 'error',
        isOpen: true,
      });
      throw error;
    }
  };

  const handleSaveColumnConfig = async (newColumns: ColumnConfig[]) => {
    if (!uiConfigAvailable || !saveConfig) {
      // Just update local state if Convex functions aren't available
      setColumns(newColumns);
      setToast({
        message: 'Configuración guardada localmente (Convex no sincronizado)',
        type: 'info',
        isOpen: true,
      });
      return;
    }
    
    try {
      await saveConfig({
        userId: 'admin',
        page: 'items_editor',
        config: {
          columns: newColumns,
          showOnlyActive,
        },
      });
      setColumns(newColumns);
      setToast({
        message: 'Configuración guardada',
        type: 'success',
        isOpen: true,
      });
    } catch (error: any) {
      console.error('Error al guardar configuración:', error);
      const errorMessage = error?.message?.includes('Could not find public function')
        ? 'Convex no está corriendo. Ejecuta: npx convex dev'
        : 'Error al guardar configuración';
      setToast({
        message: errorMessage,
        type: 'error',
        isOpen: true,
      });
    }
  };

  const handleToggleShowOnlyActive = (value: boolean) => {
    setShowOnlyActive(value);
    // Save to config (fail silently if Convex not running)
    if (uiConfigAvailable && saveConfig) {
      saveConfig({
        userId: 'admin',
        page: 'items_editor',
        config: {
          columns,
          showOnlyActive: value,
        },
      }).catch((error) => {
        // Silently fail - config will be saved when Convex is running
        console.error('Error al guardar configuración:', error);
      });
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Editor Avanzado
            </h1>
            <p className="text-gray-600 mb-4">
              Esta pantalla solo está disponible en pantallas grandes (desktop).
            </p>
            <p className="text-sm text-gray-500">
              Requiere un ancho mínimo de 1280px para una experiencia óptima.
            </p>
            <div className="mt-6">
              <a
                href="/admin/inventario"
                className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
              >
                Ver Inventario Simple
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Editor de Items</h1>
          <p className="text-sm text-gray-600 mt-1">
            Edición avanzada de inventario - {filteredItems.length} items
          </p>
          {!uiConfigAvailable && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              ⚠️ Nota: La configuración de columnas no se guardará hasta que ejecutes <code className="bg-yellow-100 px-1 rounded">npx convex dev</code>
            </div>
          )}
        </div>

        {/* Main Layout: 80/20 */}
        <div className="flex gap-6">
          {/* Table Section (80%) */}
          <div className="flex-1" style={{ width: '80%' }}>
            <ItemsTable
              items={filteredItems}
              columns={columns}
              onItemClick={handleItemClick}
              onFieldUpdate={handleFieldUpdate}
              categories={categories}
              subcategories={subcategories}
            />
          </div>

          {/* Side Panel (20%) */}
          <div className="w-80 bg-white border rounded-lg p-4 space-y-6">
            <ColumnConfigPanel columns={columns} onSave={handleSaveColumnConfig} />
            <QuickActions
              onCreateNew={handleCreateNew}
              showOnlyActive={showOnlyActive}
              onToggleShowOnlyActive={handleToggleShowOnlyActive}
            />
          </div>
        </div>
      </div>

      {/* Drawer */}
      <ItemDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveItem}
        categories={categories}
        isCreating={isCreating}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
