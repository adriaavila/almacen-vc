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
import { ImportCSVModal, ImportResult } from '@/components/admin/ItemsEditor/ImportCSVModal';
import { EditorHeader } from '@/components/admin/ItemsEditor/EditorHeader';
import { normalizeSearchText } from '@/lib/utils';

// Helper to safely check if uiConfig functions are available
function hasUiConfigFunctions(): boolean {
  try {
    if (!('uiConfig' in api)) return false;
    const uiConfig = (api as any).uiConfig;
    if (!uiConfig) return false;
    if (typeof uiConfig.getConfig !== 'function') return false;
    if (typeof uiConfig.saveConfig !== 'function') return false;
    return true;
  } catch (error) {
    return false;
  }
}

type ConvexProduct = {
  _id: Id<"products">;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  packageSize: number;
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre', visible: true, order: 0 },
  { key: 'category', label: 'Categoría', visible: true, order: 1 },
  { key: 'subCategory', label: 'Subcategoría', visible: true, order: 2 },
  { key: 'brand', label: 'Marca', visible: true, order: 3 },
  { key: 'baseUnit', label: 'Unidad', visible: true, order: 4 },
  { key: 'totalStock', label: 'Stock Total', visible: true, order: 5 },
  { key: 'stockAlmacen', label: 'Stock Almacén', visible: true, order: 6 },
  { key: 'packageSize', label: 'Tamaño Paquete', visible: true, order: 7 },
  { key: 'status', label: 'Estado', visible: true, order: 8 },
  { key: 'active', label: 'Activo', visible: true, order: 9 },
  { key: 'acciones', label: 'Acciones', visible: true, order: 10 },
];

export default function ItemsEditorPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ConvexProduct | null>(null);
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
    name?: string;
    category?: string[];
    subCategory?: string[];
    brand?: string[];
    baseUnit?: string[];
    totalStock?: { min?: number; max?: number };
    stockAlmacen?: { min?: number; max?: number };
    packageSize?: string;
    status?: ('ok' | 'bajo_stock')[];
    active?: boolean[];
  }>({});

  const products = useQuery(api.products.listWithInventory);
  const updateProduct = useMutation(api.products.update);
  const createProduct = useMutation(api.products.create);
  const initializeInventory = useMutation(api.inventory.initialize);
  
  // uiConfig availability check
  const [uiConfigAvailable, setUiConfigAvailable] = useState(false);
  
  const config = useQuery(
    uiConfigAvailable ? api.uiConfig.getConfig : ('skip' as any),
    uiConfigAvailable ? { userId: 'admin', page: 'items_editor' } : ('skip' as any)
  );
  
  const saveConfig = useMutation(
    uiConfigAvailable ? api.uiConfig.saveConfig : ('skip' as any)
  );
  
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (hasUiConfigFunctions()) {
          setUiConfigAvailable(true);
        }
      } catch {
        // Functions not available
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Check if screen is too small
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1280);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
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

  // Load config from Convex
  useEffect(() => {
    if (config && config.columns && Array.isArray(config.columns)) {
      setColumns(config.columns);
      setShowOnlyActive(config.showOnlyActive);
    }
  }, [config]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    const cats = Array.from(new Set(products.map((product) => product.category)));
    return cats.sort();
  }, [products]);

  // Get unique subcategories
  const subcategories = useMemo(() => {
    if (!products || products.length === 0) return [];
    const subcats = Array.from(
      new Set(
        products
          .map((product) => product.subCategory)
          .filter((sub): sub is string => Boolean(sub))
      )
    );
    return subcats.sort();
  }, [products]);

  // Get unique values for column filters
  const columnFilterOptions = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        marcas: [],
        unidades: [],
        locations: [],
      };
    }
    return {
      marcas: Array.from(new Set(products.map((p) => p.brand).filter((m): m is string => Boolean(m) && m !== ''))).sort(),
      unidades: Array.from(new Set(products.map((p) => p.baseUnit))).sort(),
      locations: ['almacen', 'cafetin'], // Fixed locations in new system
    };
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;
    
    // Apply showOnlyActive filter
    if (showOnlyActive) {
      filtered = filtered.filter((product) => product.active);
    }
    
    // Apply filter status
    if (filterStatus === 'active') {
      filtered = filtered.filter((product) => product.active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter((product) => !product.active);
    } else if (filterStatus === 'low_stock') {
      filtered = filtered.filter((product) => product.status === 'bajo_stock');
    }
    
    // Apply category filters
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => selectedCategories.includes(product.category));
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery.trim());
      filtered = filtered.filter((product) => 
        normalizeSearchText(product.name).includes(query) ||
        normalizeSearchText(product.category).includes(query) ||
        (product.subCategory && normalizeSearchText(product.subCategory).includes(query)) ||
        (product.brand && normalizeSearchText(product.brand).includes(query))
      );
    }

    // Apply column filters
    if (columnFilters.name) {
      const query = normalizeSearchText(columnFilters.name);
      filtered = filtered.filter((product) => normalizeSearchText(product.name).includes(query));
    }

    if (columnFilters.category && columnFilters.category.length > 0) {
      filtered = filtered.filter((product) => columnFilters.category!.includes(product.category));
    }

    if (columnFilters.subCategory && columnFilters.subCategory.length > 0) {
      filtered = filtered.filter((product) => 
        product.subCategory && columnFilters.subCategory!.includes(product.subCategory)
      );
    }

    if (columnFilters.brand && columnFilters.brand.length > 0) {
      filtered = filtered.filter((product) => 
        product.brand && columnFilters.brand!.includes(product.brand)
      );
    }

    if (columnFilters.baseUnit && columnFilters.baseUnit.length > 0) {
      filtered = filtered.filter((product) => columnFilters.baseUnit!.includes(product.baseUnit));
    }

    if (columnFilters.totalStock) {
      const { min, max } = columnFilters.totalStock;
      if (min !== undefined) {
        filtered = filtered.filter((product) => product.totalStock >= min);
      }
      if (max !== undefined) {
        filtered = filtered.filter((product) => product.totalStock <= max);
      }
    }

    if (columnFilters.stockAlmacen) {
      const { min, max } = columnFilters.stockAlmacen;
      if (min !== undefined) {
        filtered = filtered.filter((product) => product.stockAlmacen >= min);
      }
      if (max !== undefined) {
        filtered = filtered.filter((product) => product.stockAlmacen <= max);
      }
    }

    if (columnFilters.status && columnFilters.status.length > 0) {
      filtered = filtered.filter((product) => (columnFilters.status as string[]).includes(product.status));
    }

    if (columnFilters.active && columnFilters.active.length > 0) {
      filtered = filtered.filter((product) => {
        return columnFilters.active!.includes(product.active);
      });
    }
    
    return filtered;
  }, [products, showOnlyActive, filterStatus, selectedCategories, searchQuery, columnFilters]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!products) {
      return { totalItems: 0, activeItems: 0, lowStockItems: 0 };
    }
    return {
      totalItems: products.length,
      activeItems: products.filter((product) => product.active).length,
      lowStockItems: products.filter((product) => product.status === 'bajo_stock').length,
    };
  }, [products]);

  const handleItemClick = (product: ConvexProduct) => {
    setSelectedProduct(product);
    setIsCreating(false);
    setIsDrawerOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsCreating(true);
    setIsDrawerOpen(true);
  };

  const handleFieldUpdate = async (
    productId: Id<"products">,
    field: string,
    value: string | number | boolean | undefined
  ) => {
    try {
      // Validate required fields
      if (field === 'name' && (!value || (typeof value === 'string' && value.trim() === ''))) {
        setToast({
          message: 'El nombre es requerido',
          type: 'error',
          isOpen: true,
        });
        throw new Error('Name is required');
      }

      // For optional fields, convert empty string to undefined
      const optionalFields = ['subCategory', 'brand'];
      const finalValue = optionalFields.includes(field) && value === '' ? undefined : value;

      await updateProduct({
        id: productId,
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
    productId: Id<"products"> | null,
    data: Partial<ConvexProduct>
  ) => {
    try {
      if (productId) {
        // Update existing product
        await updateProduct({
          id: productId,
          name: data.name,
          brand: data.brand,
          category: data.category,
          subCategory: data.subCategory,
          baseUnit: data.baseUnit,
          purchaseUnit: data.purchaseUnit,
          conversionFactor: data.conversionFactor,
          packageSize: data.packageSize,
          active: data.active,
        });
        setToast({
          message: 'Producto actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
      } else {
        // Create new product
        const newProductId = await createProduct({
          name: data.name!,
          brand: data.brand || '',
          category: data.category!,
          subCategory: data.subCategory,
          baseUnit: data.baseUnit!,
          purchaseUnit: data.purchaseUnit || data.baseUnit!,
          conversionFactor: data.conversionFactor || 1,
          packageSize: data.packageSize || 0,
          active: data.active ?? true,
        });
        
        // Initialize inventory for the new product
        await initializeInventory({
          productId: newProductId,
          location: 'almacen',
          stockActual: 0,
          stockMinimo: 0,
        });
        
        setToast({
          message: 'Producto creado correctamente',
          type: 'success',
          isOpen: true,
        });
      }
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      setToast({
        message: 'Error al guardar producto',
        type: 'error',
        isOpen: true,
      });
      throw error;
    }
  };

  const handleSaveColumnConfig = async (newColumns: ColumnConfig[]) => {
    if (!uiConfigAvailable || !saveConfig) {
      setColumns(newColumns);
      setToast({
        message: 'Configuración guardada localmente',
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
      setToast({
        message: 'Error al guardar configuración',
        type: 'error',
        isOpen: true,
      });
    }
  };

  const handleToggleShowOnlyActive = (value: boolean) => {
    setShowOnlyActive(value);
    if (uiConfigAvailable && saveConfig) {
      saveConfig({
        userId: 'admin',
        page: 'items_editor',
        config: {
          columns,
          showOnlyActive: value,
        },
      }).catch((error) => {
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
      if (!filteredProducts || filteredProducts.length === 0) {
        setToast({
          message: 'No hay productos para exportar',
          type: 'error',
          isOpen: true,
        });
        return;
      }

      // Create CSV content with new fields
      const headers = ['name', 'brand', 'category', 'subCategory', 'baseUnit', 'purchaseUnit', 'conversionFactor', 'packageSize', 'totalStock', 'stockAlmacen', 'active'];
      const rows = filteredProducts.map(product => [
        product.name,
        product.brand,
        product.category,
        product.subCategory || '',
        product.baseUnit,
        product.purchaseUnit,
        product.conversionFactor.toString(),
        product.packageSize.toString(),
        product.totalStock.toString(),
        product.stockAlmacen.toString(),
        product.active.toString(),
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
      const filename = `productos_${timestamp}.csv`;
      
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setToast({
        message: `Exportado ${filteredProducts.length} productos a CSV`,
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
    // Import functionality needs to be updated for new schema
    setToast({
      message: 'Función de importación en actualización para nuevo esquema',
      type: 'info',
      isOpen: true,
    });
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

  if (products === undefined) {
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
          filteredItems={filteredProducts.length}
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
              items={filteredProducts as ConvexProduct[]}
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
        item={selectedProduct}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
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
