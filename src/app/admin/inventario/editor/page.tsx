'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Navbar } from '@/components/layout/Navbar';
import { ItemsTable } from '@/components/admin/ItemsEditor/ItemsTable';
import { ItemDrawer } from '@/components/admin/ItemsEditor/ItemDrawer';
import { QuickActions } from '@/components/admin/ItemsEditor/QuickActions';
import { Toast } from '@/components/ui/Toast';
import { ColumnConfig } from '@/types';
import { exportItemsToCSV, parseCSVFile, validateCSVRow, CSVRow } from '@/lib/csv';
import { ImportCSVModal, ImportResult } from '@/components/admin/ItemsEditor/ImportCSVModal';
import { EditorHeader } from '@/components/admin/ItemsEditor/EditorHeader';

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
  active?: boolean;
  sharedAreas?: string[];
  updatedBy?: string;
  updatedAt?: number;
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_stock'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<{
    nombre?: string;
    categoria?: string[];
    subcategoria?: string[];
    marca?: string[];
    unidad?: string[];
    location?: string[];
    stock_actual?: { min?: number; max?: number };
    stock_minimo?: { min?: number; max?: number };
    package_size?: string;
    status?: ('ok' | 'bajo_stock')[];
    active?: boolean[];
  }>({});

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close modals/drawers
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
          setSelectedItem(null);
        }
        if (isImportModalOpen) {
          setIsImportModalOpen(false);
          setImportResult(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isImportModalOpen]);

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

  // Get unique values for column filters
  const columnFilterOptions = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        marcas: [],
        unidades: [],
        locations: [],
      };
    }
    return {
      marcas: Array.from(new Set(items.map((item) => item.marca).filter((m): m is string => Boolean(m)))).sort(),
      unidades: Array.from(new Set(items.map((item) => item.unidad))).sort(),
      locations: Array.from(new Set(items.map((item) => item.location))).sort(),
    };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return [];
    let filtered = items;
    
    // Apply showOnlyActive filter (for backward compatibility)
    if (showOnlyActive) {
      filtered = filtered.filter((item) => item.active ?? true);
    }
    
    // Apply filter status
    if (filterStatus === 'active') {
      filtered = filtered.filter((item) => item.active ?? true);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((item) => !(item.active ?? true));
    } else if (filterStatus === 'low_stock') {
      filtered = filtered.filter((item) => item.status === 'bajo_stock');
    }
    
    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((item) => selectedCategories.includes(item.categoria));
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => 
        item.nombre.toLowerCase().includes(query) ||
        item.categoria.toLowerCase().includes(query) ||
        (item.subcategoria && item.subcategoria.toLowerCase().includes(query)) ||
        (item.marca && item.marca.toLowerCase().includes(query)) ||
        item.location.toLowerCase().includes(query)
      );
    }

    // Apply column filters
    if (columnFilters.nombre) {
      const query = columnFilters.nombre.toLowerCase();
      filtered = filtered.filter((item) => item.nombre.toLowerCase().includes(query));
    }

    if (columnFilters.categoria && columnFilters.categoria.length > 0) {
      filtered = filtered.filter((item) => columnFilters.categoria!.includes(item.categoria));
    }

    if (columnFilters.subcategoria && columnFilters.subcategoria.length > 0) {
      filtered = filtered.filter((item) => 
        item.subcategoria && columnFilters.subcategoria!.includes(item.subcategoria)
      );
    }

    if (columnFilters.marca && columnFilters.marca.length > 0) {
      filtered = filtered.filter((item) => 
        item.marca && columnFilters.marca!.includes(item.marca)
      );
    }

    if (columnFilters.unidad && columnFilters.unidad.length > 0) {
      filtered = filtered.filter((item) => columnFilters.unidad!.includes(item.unidad));
    }

    if (columnFilters.location && columnFilters.location.length > 0) {
      filtered = filtered.filter((item) => columnFilters.location!.includes(item.location));
    }

    if (columnFilters.stock_actual) {
      const { min, max } = columnFilters.stock_actual;
      if (min !== undefined) {
        filtered = filtered.filter((item) => item.stock_actual >= min);
      }
      if (max !== undefined) {
        filtered = filtered.filter((item) => item.stock_actual <= max);
      }
    }

    if (columnFilters.stock_minimo) {
      const { min, max } = columnFilters.stock_minimo;
      if (min !== undefined) {
        filtered = filtered.filter((item) => item.stock_minimo >= min);
      }
      if (max !== undefined) {
        filtered = filtered.filter((item) => item.stock_minimo <= max);
      }
    }

    if (columnFilters.package_size) {
      const query = columnFilters.package_size.toLowerCase();
      filtered = filtered.filter((item) => 
        item.package_size && item.package_size.toLowerCase().includes(query)
      );
    }

    if (columnFilters.status && columnFilters.status.length > 0) {
      filtered = filtered.filter((item) => columnFilters.status!.includes(item.status));
    }

    if (columnFilters.active && columnFilters.active.length > 0) {
      filtered = filtered.filter((item) => {
        const itemActive = item.active ?? true;
        return columnFilters.active!.includes(itemActive);
      });
    }
    
    return filtered;
  }, [items, showOnlyActive, filterStatus, selectedCategories, searchQuery, columnFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!items) {
      return { totalItems: 0, activeItems: 0, lowStockItems: 0 };
    }
    return {
      totalItems: items.length,
      activeItems: items.filter((item) => item.active ?? true).length,
      lowStockItems: items.filter((item) => item.status === 'bajo_stock').length,
    };
  }, [items]);

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
          sharedAreas: data.sharedAreas,
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
          sharedAreas: data.sharedAreas,
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

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleColumnFilterChange = (
    columnKey: string,
    value: string | string[] | boolean[] | { min?: number; max?: number } | undefined
  ) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
  };

  const clearAllColumnFilters = () => {
    setColumnFilters({});
  };

  const handleExportCSV = () => {
    try {
      if (!filteredItems || filteredItems.length === 0) {
        setToast({
          message: 'No hay items para exportar',
          type: 'error',
          isOpen: true,
        });
        return;
      }

      const csvContent = exportItemsToCSV(filteredItems);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      // Generate filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      const filename = `inventario_${timestamp}.csv`;
      
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({
        message: `Exportado ${filteredItems.length} items a CSV`,
        type: 'success',
        isOpen: true,
      });
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      setToast({
        message: 'Error al exportar CSV',
        type: 'error',
        isOpen: true,
      });
    }
  };

  const handleImportCSV = async (file: File) => {
    try {
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        setToast({
          message: 'El archivo debe ser un CSV',
          type: 'error',
          isOpen: true,
        });
        return;
      }

      setIsImporting(true);
      setIsImportModalOpen(true);
      setImportResult(null);

      // Parse CSV file
      const rows = await parseCSVFile(file);
      
      if (rows.length === 0) {
        setImportResult({
          totalRows: 0,
          created: 0,
          updated: 0,
          errors: [{ row: 0, message: 'El archivo CSV está vacío o no tiene datos válidos' }],
        });
        setIsImporting(false);
        return;
      }

      const result: ImportResult = {
        totalRows: rows.length,
        created: 0,
        updated: 0,
        errors: [],
      };

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // Validate row
        const validation = validateCSVRow(row, i);
        if (!validation.isValid) {
          result.errors.push(...validation.errors.map(err => ({ row: i + 1, message: err })));
          continue;
        }

        // Find existing item by nombre (case-insensitive)
        const existingItem = items?.find(
          (item) => item.nombre.toLowerCase().trim() === row.nombre.toLowerCase().trim()
        );

        try {
          if (existingItem) {
            // Update existing item
            await updateItem({
              id: existingItem._id,
              nombre: row.nombre,
              categoria: row.categoria,
              subcategoria: row.subcategoria || undefined,
              marca: row.marca || undefined,
              unidad: row.unidad,
              stock_actual: row.stock_actual,
              stock_minimo: row.stock_minimo,
              package_size: row.package_size || undefined,
              location: row.location,
              extra_notes: row.extra_notes || undefined,
              active: row.active,
              updatedBy: row.updatedBy || undefined,
              // updatedAt is ignored, set automatically in mutation
            });
            result.updated++;
          } else {
            // Create new item
            await createItem({
              nombre: row.nombre,
              categoria: row.categoria,
              subcategoria: row.subcategoria,
              marca: row.marca,
              unidad: row.unidad,
              stock_actual: row.stock_actual,
              stock_minimo: row.stock_minimo,
              package_size: row.package_size,
              location: row.location || 'Almacén Principal',
              extra_notes: row.extra_notes,
              active: row.active ?? true,
              // updatedBy and updatedAt will be set automatically in mutation
            });
            result.created++;
          }
        } catch (error: any) {
          result.errors.push({
            row: i + 1,
            message: `Error al procesar fila ${i + 1}: ${error?.message || 'Error desconocido'}`,
          });
        }
      }

      setImportResult(result);
      setIsImporting(false);

      if (result.errors.length === 0) {
        setToast({
          message: `Importación exitosa: ${result.created} creados, ${result.updated} actualizados`,
          type: 'success',
          isOpen: true,
        });
      } else {
        setToast({
          message: `Importación completada con errores: ${result.created} creados, ${result.updated} actualizados, ${result.errors.length} errores`,
          type: 'info',
          isOpen: true,
        });
      }
    } catch (error: any) {
      console.error('Error al importar CSV:', error);
      setIsImporting(false);
      setImportResult({
        totalRows: 0,
        created: 0,
        updated: 0,
        errors: [{ row: 0, message: `Error al parsear CSV: ${error?.message || 'Error desconocido'}` }],
      });
      setToast({
        message: 'Error al importar CSV',
        type: 'error',
        isOpen: true,
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
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            <p className="text-gray-600 font-medium">Cargando editor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-6 max-w-[1920px] mx-auto animate-fade-in">
        {/* Header with Stats, Search and Filters */}
        <EditorHeader
          totalItems={stats.totalItems}
          activeItems={stats.activeItems}
          lowStockItems={stats.lowStockItems}
          filteredItems={filteredItems.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          selectedCategories={selectedCategories}
          onCategoryToggle={handleCategoryToggle}
          availableCategories={categories}
          onExportCSV={handleExportCSV}
          onImportCSV={handleImportCSV}
        />

        {!uiConfigAvailable && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Nota: La configuración de columnas no se guardará hasta que ejecutes <code className="bg-yellow-100 px-1 rounded">npx convex dev</code></span>
          </div>
        )}

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
              columnFilters={columnFilters}
              onColumnFilterChange={handleColumnFilterChange}
              columnFilterOptions={columnFilterOptions}
              onClearAllColumnFilters={clearAllColumnFilters}
            />
          </div>

          {/* Side Panel (20%) */}
          <div className="w-80">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <QuickActions
                onCreateNew={handleCreateNew}
                showOnlyActive={showOnlyActive}
                onToggleShowOnlyActive={handleToggleShowOnlyActive}
              />
            </div>
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

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportResult(null);
        }}
        isImporting={isImporting}
        result={importResult}
      />
    </div>
  );
}
