'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { ItemsTable } from '@/components/admin/ItemsEditor/ItemsTable';
import { ItemDrawer } from '@/components/admin/ItemsEditor/ItemDrawer';
import { QuickActions } from '@/components/admin/ItemsEditor/QuickActions';
import { Toast } from '@/components/ui/Toast';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { ColumnConfig, Inventory, Movement } from '@/types';
import { ImportCSVModal, ImportResult } from '@/components/admin/ItemsEditor/ImportCSVModal';
import { EditorHeader } from '@/components/admin/ItemsEditor/EditorHeader';
import { TableSelector } from '@/components/admin/ItemsEditor/TableSelector';
import { normalizeSearchText } from '@/lib/utils';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { parseCSVFile, validateCSVProductRow } from '@/lib/csv';

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
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Nombre', visible: true, order: 0 },
  { key: 'brand', label: 'Marca', visible: true, order: 1 },
  { key: 'category', label: 'Categoría', visible: true, order: 2 },
  { key: 'subCategory', label: 'Subcategoría', visible: true, order: 3 },
  { key: 'baseUnit', label: 'Unidad Base', visible: true, order: 4 },
  { key: 'purchaseUnit', label: 'Unidad Compra', visible: true, order: 5 },
  { key: 'conversionFactor', label: 'Factor Conversión', visible: true, order: 6 },
  { key: 'active', label: 'Activo', visible: true, order: 7 },
  { key: 'status', label: 'Estado', visible: true, order: 9 },
  { key: 'acciones', label: 'Acciones', visible: true, order: 10 },
];

const DEFAULT_COLUMNS_INVENTORY: ColumnConfig[] = [
  { key: 'productName', label: 'Producto', visible: true, order: 0 },
  { key: 'location', label: 'Ubicación', visible: true, order: 1 },
  { key: 'stockActual', label: 'Stock Actual', visible: true, order: 2 },
  { key: 'stockMinimo', label: 'Stock Mínimo', visible: true, order: 3 },
  { key: 'status', label: 'Estado', visible: true, order: 4 },
  { key: 'updatedAt', label: 'Actualizado', visible: true, order: 5 },
  { key: 'acciones', label: 'Acciones', visible: true, order: 6 },
];

const DEFAULT_COLUMNS_MOVEMENTS: ColumnConfig[] = [
  { key: 'productName', label: 'Producto', visible: true, order: 0 },
  { key: 'type', label: 'Tipo', visible: true, order: 1 },
  { key: 'from', label: 'Desde', visible: true, order: 2 },
  { key: 'to', label: 'Hacia', visible: true, order: 3 },
  { key: 'quantity', label: 'Cantidad', visible: true, order: 4 },
  { key: 'prevStock', label: 'Stock Anterior', visible: true, order: 5 },
  { key: 'nextStock', label: 'Stock Nuevo', visible: true, order: 6 },
  { key: 'user', label: 'Usuario', visible: true, order: 7 },
  { key: 'timestamp', label: 'Fecha', visible: true, order: 8 },
];

export default function ItemsEditorPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedTable, setSelectedTable] = useState<'products' | 'inventory' | 'movements'>('products');
  const [selectedProduct, setSelectedProduct] = useState<ConvexProduct | null>(null);
  const [selectedInventory, setSelectedInventory] = useState<any | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({ message: '', type: 'success', isOpen: false });
  const [productToDelete, setProductToDelete] = useState<{ id: Id<"products">; name: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'low_stock'>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<'all' | 'almacen' | 'cafetin'>('all');
  const [isMobileQuickActionsOpen, setIsMobileQuickActionsOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<{
    name?: string;
    category?: string[];
    subCategory?: string[];
    brand?: string[];
    baseUnit?: string[];
    purchaseUnit?: string[];
    conversionFactor?: string;
    status?: ('ok' | 'bajo_stock')[];
    active?: boolean[];
  }>({});

  const products = useQuery(api.products.listWithInventory);
  // Fetch all inventory - filtering by location happens client-side for simplicity
  // This is efficient for typical dataset sizes. Can be optimized later with location-specific queries if needed.
  const inventoryList = useQuery(api.inventory.list);
  const movements = useQuery(api.movements.list, { limit: 500 });

  const updateProduct = useMutation(api.products.update);
  const createProduct = useMutation(api.products.create);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const initializeInventory = useMutation(api.inventory.initialize);
  const updateStock = useMutation(api.inventory.updateStock);
  const setMinStock = useMutation(api.inventory.setMinStock);
  const bulkImport = useMutation(api.products.bulkImport);

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

  // Check if screen is mobile/tablet for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024); // lg breakpoint
      // Auto-collapse editor sidebar on smaller screens
      if (width < 1440 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isSidebarOpen]);

  // Load sidebar preference from localStorage
  useEffect(() => {
    const savedSidebarState = localStorage.getItem('editor-sidebar-open');
    if (savedSidebarState !== null) {
      setIsSidebarOpen(savedSidebarState === 'true');
    }
  }, []);

  // Save sidebar preference to localStorage
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem('editor-sidebar-open', String(newState));
      return newState;
    });
  };

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

  // Update columns when table type changes
  useEffect(() => {
    switch (selectedTable) {
      case 'products':
        setColumns(DEFAULT_COLUMNS);
        break;
      case 'inventory':
        setColumns(DEFAULT_COLUMNS_INVENTORY);
        break;
      case 'movements':
        setColumns(DEFAULT_COLUMNS_MOVEMENTS);
        break;
    }
    // Reset filters when switching tables
    setColumnFilters({});
    setSearchQuery('');
    setFilterStatus('all');
    setSelectedCategories([]);
    setSelectedLocation('all');
  }, [selectedTable]);

  // Get unique categories
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    const activeProducts = products.filter(p => !p.category || p.category.toLowerCase() !== 'cafetin');
    const cats = Array.from(new Set(activeProducts.map((product) => product.category)));
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
      purchaseUnits: Array.from(new Set(products.map((p) => p.purchaseUnit).filter((u): u is string => Boolean(u) && u !== ''))).sort(),
      locations: ['almacen', 'cafetin'], // Fixed locations in new system
    };
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;

    // Exclude Cafetin products
    filtered = filtered.filter((product) => !product.category || product.category.toLowerCase() !== 'cafetin');

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

    if (columnFilters.purchaseUnit && columnFilters.purchaseUnit.length > 0) {
      filtered = filtered.filter((product) =>
        product.purchaseUnit && columnFilters.purchaseUnit!.includes(product.purchaseUnit)
      );
    }

    if (columnFilters.conversionFactor) {
      const query = normalizeSearchText(columnFilters.conversionFactor);
      filtered = filtered.filter((product) =>
        product.conversionFactor.toString().includes(query)
      );
    }

    if (columnFilters.status && columnFilters.status.length > 0) {
      filtered = filtered.filter((product) => (columnFilters.status as string[]).includes(product.status));
    }

    if (columnFilters.active && columnFilters.active.length > 0) {
      filtered = filtered.filter((product) => {
        return columnFilters.active!.includes(product.active);
      });
    }

    // Sort alphabetically by name
    filtered.sort((a, b) => {
      const nameA = normalizeSearchText(a.name);
      const nameB = normalizeSearchText(b.name);
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });

    return filtered;
  }, [products, showOnlyActive, filterStatus, selectedCategories, searchQuery, columnFilters]);

  // Filter inventory records
  const filteredInventory = useMemo(() => {
    if (!inventoryList) return [];
    let filtered = inventoryList;

    // Exclude Cafetin products
    filtered = filtered.filter((inv) => !inv.product?.category || inv.product.category.toLowerCase() !== 'cafetin');

    // Apply location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter((inv) => inv.location === selectedLocation);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery.trim());
      filtered = filtered.filter((inv) =>
        inv.product && (
          normalizeSearchText(inv.product.name).includes(query) ||
          normalizeSearchText(inv.product.category || '').includes(query) ||
          (inv.product.brand && normalizeSearchText(inv.product.brand).includes(query))
        )
      );
    }

    // Apply filter status
    if (filterStatus === 'low_stock') {
      filtered = filtered.filter((inv) => inv.stockActual <= inv.stockMinimo);
    }

    return filtered;
  }, [inventoryList, selectedLocation, searchQuery, filterStatus]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    let filtered = movements;

    // Exclude Cafetin products
    filtered = filtered.filter((mov) => !mov.product?.category || mov.product.category.toLowerCase() !== 'cafetin');

    // Apply search query
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery.trim());
      filtered = filtered.filter((mov) =>
        mov.product && normalizeSearchText(mov.product.name).includes(query)
      );
    }

    return filtered;
  }, [movements, searchQuery]);

  // Calculate statistics based on selected table
  const stats = useMemo(() => {
    if (selectedTable === 'products') {
      if (!products) {
        return { totalItems: 0, activeItems: 0, lowStockItems: 0 };
      }
      return {
        totalItems: products.length,
        activeItems: products.filter((product) => product.active).length,
        lowStockItems: products.filter((product) => product.status === 'bajo_stock').length,
      };
    } else if (selectedTable === 'inventory') {
      if (!inventoryList) {
        return { totalItems: 0, activeItems: 0, lowStockItems: 0 };
      }
      return {
        totalItems: inventoryList.length,
        activeItems: inventoryList.length,
        lowStockItems: inventoryList.filter((inv) => inv.stockActual <= inv.stockMinimo).length,
      };
    } else {
      if (!movements) {
        return { totalItems: 0, activeItems: 0, lowStockItems: 0 };
      }
      return {
        totalItems: movements.length,
        activeItems: movements.length,
        lowStockItems: 0,
      };
    }
  }, [products, inventoryList, movements, selectedTable]);

  const handleItemClick = (item: any) => {
    if (selectedTable === 'products') {
      setSelectedProduct(item);
      setSelectedInventory(null);
      setSelectedMovement(null);
      setIsCreating(false);
      setIsDrawerOpen(true);
    } else if (selectedTable === 'inventory') {
      setSelectedInventory(item);
      setSelectedProduct(null);
      setSelectedMovement(null);
      setIsCreating(false);
      setIsDrawerOpen(true);
    } else if (selectedTable === 'movements') {
      setSelectedMovement(item);
      setSelectedProduct(null);
      setSelectedInventory(null);
      setIsCreating(false);
      setIsDrawerOpen(true);
    }
  };

  const handleCreateNew = () => {
    if (selectedTable === 'products') {
      setSelectedProduct(null);
      setIsCreating(true);
      setIsDrawerOpen(true);
    } else if (selectedTable === 'inventory') {
      setSelectedInventory(null);
      setIsCreating(true);
      setIsDrawerOpen(true);
    } else if (selectedTable === 'movements') {
      // Movements are mostly read-only, but we can create adjustments
      setSelectedMovement(null);
      setIsCreating(true);
      setIsDrawerOpen(true);
    }
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
          active: data.active,
        });
        setToast({
          message: 'Producto actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
      } else {
        // Create new product (or get existing if name already exists)
        const newProductId = await createProduct({
          name: data.name!,
          brand: data.brand || '',
          category: data.category!,
          subCategory: data.subCategory,
          baseUnit: data.baseUnit!,
          purchaseUnit: data.purchaseUnit || data.baseUnit!,
          conversionFactor: data.conversionFactor || 1,
          active: data.active ?? true,
        });

        // Initialize inventory for the product (only if it doesn't exist in this location)
        // If product already existed, this will add inventory in almacen location
        try {
          await initializeInventory({
            productId: newProductId,
            location: 'almacen',
            stockActual: 0,
            stockMinimo: 0,
          });
        } catch (error: any) {
          // If inventory already exists in this location, that's okay
          // The product was already in the system, just continue
          if (!error.message?.includes('Ya existe inventario')) {
            throw error;
          }
        }

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

  const handleDeleteProduct = (productId: Id<"products">, productName: string) => {
    setProductToDelete({ id: productId, name: productName });
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct({ id: productToDelete.id });
      setToast({
        message: `Producto "${productToDelete.name}" eliminado correctamente`,
        type: 'success',
        isOpen: true,
      });
      setIsDrawerOpen(false);
      setSelectedProduct(null);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      setToast({
        message: 'Error al eliminar producto',
        type: 'error',
        isOpen: true,
      });
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
      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = '';
      let count = 0;

      if (selectedTable === 'products') {
        if (!filteredProducts || filteredProducts.length === 0) {
          setToast({
            message: 'No hay productos para exportar',
            type: 'error',
            isOpen: true,
          });
          return;
        }
        headers = ['id', 'name', 'brand', 'category', 'subCategory', 'baseUnit', 'purchaseUnit', 'conversionFactor', 'active'];
        rows = filteredProducts.map(product => [
          product._id,
          product.name,
          product.brand,
          product.category,
          product.subCategory || '',
          product.baseUnit,
          product.purchaseUnit,
          product.conversionFactor.toString(),
          product.active.toString(),
        ]);
        count = filteredProducts.length;
        filename = `productos_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')}.csv`;
      } else if (selectedTable === 'inventory') {
        if (!filteredInventory || filteredInventory.length === 0) {
          setToast({
            message: 'No hay registros de inventario para exportar',
            type: 'error',
            isOpen: true,
          });
          return;
        }
        headers = ['productName', 'location', 'stockActual', 'stockMinimo', 'status', 'updatedAt'];
        rows = filteredInventory.map(inv => [
          inv.product?.name || '',
          inv.location,
          inv.stockActual.toString(),
          inv.stockMinimo.toString(),
          inv.stockActual <= inv.stockMinimo ? 'bajo_stock' : 'ok',
          new Date(inv.updatedAt).toISOString(),
        ]);
        count = filteredInventory.length;
        filename = `inventario_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')}.csv`;
      } else if (selectedTable === 'movements') {
        if (!filteredMovements || filteredMovements.length === 0) {
          setToast({
            message: 'No hay movimientos para exportar',
            type: 'error',
            isOpen: true,
          });
          return;
        }
        headers = ['productName', 'type', 'from', 'to', 'quantity', 'prevStock', 'nextStock', 'user', 'timestamp'];
        rows = filteredMovements.map(mov => [
          mov.product?.name || '',
          mov.type,
          mov.from || '',
          mov.to,
          mov.quantity.toString(),
          mov.prevStock.toString(),
          mov.nextStock.toString(),
          mov.user,
          new Date(mov.timestamp).toISOString(),
        ]);
        count = filteredMovements.length;
        filename = `movimientos_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_')}.csv`;
      }

      const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');

      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({
        message: `Exportado ${count} registros a CSV`,
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
    setIsImportModalOpen(true);
    setIsImporting(true);
    setImportResult(null);

    try {
      // Parse CSV file with error reporting
      const parseResult = await parseCSVFile(file, true);
      const csvRows = parseResult.rows;
      const parsingErrors = parseResult.errors;

      if (csvRows.length === 0 && parsingErrors.length === 0) {
        setImportResult({
          totalRows: 0,
          created: 0,
          updated: 0,
          errors: [{ row: 0, message: 'El archivo CSV está vacío o no contiene datos válidos' }],
        });
        setIsImporting(false);
        return;
      }

      // Validate all rows
      const validationErrors: Array<{ row: number; field?: string; message: string }> = [...parsingErrors];
      const validRows = [];

      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i];
        const validation = validateCSVProductRow(row, i);

        if (!validation.isValid) {
          validation.errors.forEach((error) => {
            validationErrors.push({
              row: i + 1,
              message: error,
            });
          });
        } else {
          validRows.push(row);
        }
      }

      // Calculate total rows (including skipped ones)
      const totalRows = csvRows.length + parsingErrors.length;

      // If all rows have validation errors, stop here
      if (validRows.length === 0) {
        setImportResult({
          totalRows,
          created: 0,
          updated: 0,
          errors: validationErrors,
        });
        setIsImporting(false);
        return;
      }

      // Call bulk import mutation
      const result = await bulkImport({
        products: validRows.map((row) => ({
          id: row.id,
          name: row.name,
          brand: row.brand,
          category: row.category,
          subCategory: row.subCategory,
          baseUnit: row.baseUnit,
          purchaseUnit: row.purchaseUnit,
          conversionFactor: row.conversionFactor,
          active: row.active,
          stockAlmacen: row.stockAlmacen,
          stockCafetin: row.stockCafetin,
          stockMinimoAlmacen: row.stockMinimoAlmacen,
          stockMinimoCafetin: row.stockMinimoCafetin,
        })),
      });

      // Combine validation errors with import errors
      const allErrors = [
        ...validationErrors,
        ...result.errors.map((err) => ({
          row: err.row,
          message: `${err.name}: ${err.error}`,
        })),
      ];

      setImportResult({
        totalRows,
        created: result.created,
        updated: result.updated,
        errors: allErrors,
      });

      // Show success toast if import was successful
      if (result.created > 0 || result.updated > 0) {
        setToast({
          message: `Importación completada: ${result.created} creados, ${result.updated} actualizados`,
          type: 'success',
          isOpen: true,
        });
      } else if (allErrors.length > 0) {
        setToast({
          message: `Importación completada con errores. Ver detalles en el modal.`,
          type: 'error',
          isOpen: true,
        });
      }
    } catch (error: any) {
      console.error('Error al importar CSV:', error);
      setImportResult({
        totalRows: 0,
        created: 0,
        updated: 0,
        errors: [{ row: 0, message: error.message || 'Error desconocido al importar el archivo CSV' }],
      });
      setToast({
        message: 'Error al importar el archivo CSV',
        type: 'error',
        isOpen: true,
      });
    } finally {
      setIsImporting(false);
    }
  };


  if (selectedTable === 'products' && products === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600 font-medium">Cargando editor...</p>
        </div>
      </div>
    );
  }

  if (selectedTable === 'inventory' && inventoryList === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600 font-medium">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  if (selectedTable === 'movements' && movements === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600 font-medium">Cargando movimientos...</p>
        </div>
      </div>
    );
  }

  const getFilteredItemsCount = () => {
    if (selectedTable === 'products') return filteredProducts.length;
    if (selectedTable === 'inventory') return filteredInventory.length;
    return filteredMovements.length;
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6 w-full max-w-full animate-fade-in overflow-x-hidden">
      {/* Header with Stats, Search and Filters */}
      <EditorHeader
        totalItems={stats.totalItems}
        activeItems={stats.activeItems}
        lowStockItems={stats.lowStockItems}
        filteredItems={getFilteredItemsCount()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        selectedCategories={selectedCategories}
        onCategoryToggle={handleCategoryToggle}
        availableCategories={categories}
        onExportCSV={handleExportCSV}
        onImportCSV={handleImportCSV}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        selectedTable={selectedTable}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
      />

      {/* Table Selector */}
      <TableSelector
        selectedTable={selectedTable}
        onTableChange={setSelectedTable}
      />

      {!uiConfigAvailable && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Nota: La configuración de columnas no se guardará hasta que ejecutes <code className="bg-yellow-100 px-1 rounded">npx convex dev</code></span>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex relative gap-4">
        {/* Table Section */}
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          {selectedTable === 'products' && (
            <ItemsTable
              items={filteredProducts as ConvexProduct[]}
              columns={columns}
              onItemClick={handleItemClick}
              onFieldUpdate={handleFieldUpdate}
              onDelete={handleDeleteProduct}
              categories={categories}
              subcategories={subcategories}
              columnFilters={columnFilters}
              onColumnFilterChange={handleColumnFilterChange}
              columnFilterOptions={columnFilterOptions}
              onClearAllColumnFilters={clearAllColumnFilters}
              tableType="products"
            />
          )}
          {selectedTable === 'inventory' && inventoryList && (
            <ItemsTable
              items={filteredInventory as any[]}
              columns={columns}
              onItemClick={handleItemClick}
              onFieldUpdate={handleFieldUpdate}
              categories={categories}
              subcategories={subcategories}
              columnFilters={columnFilters}
              onColumnFilterChange={handleColumnFilterChange}
              columnFilterOptions={columnFilterOptions}
              onClearAllColumnFilters={clearAllColumnFilters}
              tableType="inventory"
            />
          )}
          {selectedTable === 'movements' && movements && (
            <ItemsTable
              items={filteredMovements as any[]}
              columns={columns}
              onItemClick={handleItemClick}
              onFieldUpdate={handleFieldUpdate}
              categories={categories}
              subcategories={subcategories}
              columnFilters={columnFilters}
              onColumnFilterChange={handleColumnFilterChange}
              columnFilterOptions={columnFilterOptions}
              onClearAllColumnFilters={clearAllColumnFilters}
              tableType="movements"
            />
          )}
        </div>

        {/* Side Panel - Desktop only */}
        <div
          className={`transition-all duration-300 ease-in-out shrink-0 hidden lg:block ${isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
            }`}
        >
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm h-fit">
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
        item={selectedTable === 'products' ? selectedProduct : selectedTable === 'inventory' ? selectedInventory : selectedMovement}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
          setSelectedInventory(null);
          setSelectedMovement(null);
        }}
        onSave={handleSaveItem}
        onDelete={selectedTable === 'products' && selectedProduct ? () => handleDeleteProduct(selectedProduct._id, selectedProduct.name) : undefined}
        categories={categories}
        isCreating={isCreating}
        tableType={selectedTable}
        products={products || []}
        updateStock={updateStock}
        setMinStock={setMinStock}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={productToDelete !== null}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar producto"
        message={`¿Estás seguro de que deseas eliminar el producto "${productToDelete?.name}"?\n\nEsta acción eliminará el producto y todos sus registros de inventario. Los movimientos históricos se mantendrán para auditoría.\n\nEsta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
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

      {/* Mobile Quick Actions FAB and Bottom Sheet */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsMobileQuickActionsOpen(true)}
          className="touch-target w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center"
          aria-label="Acciones rápidas"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <Sheet open={isMobileQuickActionsOpen} onOpenChange={setIsMobileQuickActionsOpen}>
        <SheetContent side="bottom" className="lg:hidden">
          <SheetHeader>
            <SheetTitle>Acciones Rápidas</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <QuickActions
              onCreateNew={() => {
                handleCreateNew();
                setIsMobileQuickActionsOpen(false);
              }}
              showOnlyActive={showOnlyActive}
              onToggleShowOnlyActive={handleToggleShowOnlyActive}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
