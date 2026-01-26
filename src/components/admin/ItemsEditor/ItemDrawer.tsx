'use client';

import { useState, useEffect } from 'react';
import { Id } from 'convex/_generated/dataModel';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/Button';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

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

interface ItemDrawerProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: Id<"products"> | null, data: any) => Promise<void>;
  onDelete?: () => void;
  categories: string[];
  isCreating?: boolean;
  tableType?: 'products' | 'inventory' | 'movements';
  products?: ConvexProduct[];
  updateStock?: any;
  setMinStock?: any;
}

export function ItemDrawer({
  item,
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories,
  isCreating = false,
  tableType = 'products',
  products = [],
  updateStock,
  setMinStock,
}: ItemDrawerProps) {
  const [formData, setFormData] = useState<any>({});
  const [inventoryFormData, setInventoryFormData] = useState({
    productId: '' as Id<"products"> | '',
    location: 'almacen' as 'almacen' | 'cafetin',
    stockActual: 0,
    stockMinimo: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tableType === 'products') {
      if (item && !isCreating) {
        setFormData({
          name: item.name,
          brand: item.brand || '',
          category: item.category,
          subCategory: item.subCategory || '',
          baseUnit: item.baseUnit,
          purchaseUnit: item.purchaseUnit || '',
          conversionFactor: item.conversionFactor || 1,
          active: item.active,
        });
      } else {
        setFormData({
          name: '',
          brand: '',
          category: '',
          subCategory: '',
          baseUnit: '',
          purchaseUnit: '',
          conversionFactor: 1,
          active: true,
        });
      }
    } else if (tableType === 'inventory') {
      if (item && !isCreating) {
        setInventoryFormData({
          productId: item.productId || '',
          location: item.location || 'almacen',
          stockActual: item.stockActual ?? 0,
          stockMinimo: item.stockMinimo ?? 0,
        });
      } else {
        setInventoryFormData({
          productId: '',
          location: 'almacen',
          stockActual: 0,
          stockMinimo: 0,
        });
      }
    }
  }, [item, isCreating, tableType]);

  const handleSave = async () => {
    if (tableType === 'products') {
      if (!formData.name || !formData.category || !formData.baseUnit) {
        return;
      }
      setIsSaving(true);
      try {
        await onSave(item?._id || null, formData);
        onClose();
      } catch (error) {
        console.error('Error al guardar:', error);
      } finally {
        setIsSaving(false);
      }
    } else if (tableType === 'inventory') {
      if (!inventoryFormData.productId) {
        return;
      }
      setIsSaving(true);
      try {
        if (updateStock && setMinStock) {
          await updateStock({
            productId: inventoryFormData.productId,
            location: inventoryFormData.location,
            newStock: inventoryFormData.stockActual,
            user: 'admin',
          });
          await setMinStock({
            productId: inventoryFormData.productId,
            location: inventoryFormData.location,
            stockMinimo: inventoryFormData.stockMinimo,
          });
        }
        onClose();
      } catch (error) {
        console.error('Error al guardar inventario:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto max-h-screen">
        <SheetHeader>
          <SheetTitle>
            {tableType === 'products' && (isCreating ? 'Crear nuevo producto' : `Editar: ${item?.name}`)}
            {tableType === 'inventory' && (isCreating ? 'Crear registro de inventario' : `Editar inventario: ${item?.product?.name || 'N/A'}`)}
            {tableType === 'movements' && `Movimiento: ${item?.product?.name || 'N/A'}`}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {tableType === 'products' && (
            <>
              {/* Nombre */}
              <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Categoría */}
          <div>
            <Label htmlFor="category">Categoría *</Label>
            <Select
              value={formData.category || ''}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategoría */}
          <div>
            <Label htmlFor="subCategory">Subcategoría</Label>
            <Input
              id="subCategory"
              value={formData.subCategory || ''}
              onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Marca */}
          <div>
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Unidad Base */}
          <div>
            <Label htmlFor="baseUnit">Unidad Base *</Label>
            <Input
              id="baseUnit"
              value={formData.baseUnit || ''}
              onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
              className="mt-1"
              placeholder="ej: unidad, gr, ml"
            />
            <p className="mt-1 text-xs text-gray-500">
              La unidad mínima de consumo (unidad, gr, ml, etc.)
            </p>
          </div>

          {/* Unidad de Compra */}
          <div>
            <Label htmlFor="purchaseUnit">Unidad de Compra</Label>
            <Input
              id="purchaseUnit"
              value={formData.purchaseUnit || ''}
              onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })}
              className="mt-1"
              placeholder="ej: caja, fardo, saco"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cómo compras este producto del proveedor
            </p>
          </div>

          {/* Factor de Conversión */}
          <div>
            <Label htmlFor="conversionFactor">Factor de Conversión</Label>
            <Input
              id="conversionFactor"
              type="number"
              min="1"
              value={formData.conversionFactor || 1}
              onChange={(e) =>
                setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })
              }
              className="mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cuántas unidades base hay en una unidad de compra
            </p>
          </div>

          {/* Activo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active ?? true}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, active: checked as boolean })
              }
            />
            <Label htmlFor="active" className="cursor-pointer">
              Producto activo
            </Label>
          </div>

          {/* Info de stock (solo lectura) */}
          {item && !isCreating && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Información de Stock</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Stock Total:</span>
                  <span className="ml-2 font-medium">{item.totalStock}</span>
                </div>
                <div>
                  <span className="text-gray-500">Stock Almacén:</span>
                  <span className="ml-2 font-medium">{item.stockAlmacen}</span>
                </div>
                <div>
                  <span className="text-gray-500">Stock Cafetín:</span>
                  <span className="ml-2 font-medium">{item.stockCafetin}</span>
                </div>
                <div>
                  <span className="text-gray-500">Estado:</span>
                  <span className={`ml-2 font-medium ${item.status === 'bajo_stock' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {item.status === 'bajo_stock' ? 'Bajo Stock' : 'OK'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Para modificar el stock, usa la sección de movimientos.
              </p>
            </div>
          )}
            </>
          )}

          {tableType === 'inventory' && (
            <>
              {/* Product Selector */}
              <div>
                <Label htmlFor="productId">Producto *</Label>
                <Select
                  value={inventoryFormData.productId}
                  onValueChange={(value) => setInventoryFormData({ ...inventoryFormData, productId: value as Id<"products"> })}
                  disabled={!isCreating}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product._id} value={product._id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Ubicación *</Label>
                <Select
                  value={inventoryFormData.location}
                  onValueChange={(value) => setInventoryFormData({ ...inventoryFormData, location: value as 'almacen' | 'cafetin' })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="almacen">Almacén</SelectItem>
                    <SelectItem value="cafetin">Cafetín</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Actual */}
              <div>
                <Label htmlFor="stockActual">Stock Actual *</Label>
                <Input
                  id="stockActual"
                  type="number"
                  min="0"
                  value={inventoryFormData.stockActual}
                  onChange={(e) =>
                    setInventoryFormData({ ...inventoryFormData, stockActual: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
              </div>

              {/* Stock Mínimo */}
              <div>
                <Label htmlFor="stockMinimo">Stock Mínimo *</Label>
                <Input
                  id="stockMinimo"
                  type="number"
                  min="0"
                  value={inventoryFormData.stockMinimo}
                  onChange={(e) =>
                    setInventoryFormData({ ...inventoryFormData, stockMinimo: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1"
                />
              </div>
            </>
          )}

          {tableType === 'movements' && item && (
            <div className="space-y-4">
              <div>
                <Label>Producto</Label>
                <div className="mt-1 text-gray-900 font-medium">{item.product?.name || 'N/A'}</div>
              </div>
              <div>
                <Label>Tipo</Label>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.type === 'COMPRA' ? 'bg-blue-100 text-blue-800' :
                    item.type === 'TRASLADO' ? 'bg-purple-100 text-purple-800' :
                    item.type === 'CONSUMO' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {item.type}
                  </span>
                </div>
              </div>
              <div>
                <Label>Desde</Label>
                <div className="mt-1 text-gray-700">{item.from || '-'}</div>
              </div>
              <div>
                <Label>Hacia</Label>
                <div className="mt-1 text-gray-700">{item.to || '-'}</div>
              </div>
              <div>
                <Label>Cantidad</Label>
                <div className="mt-1 text-gray-900 font-medium">{item.quantity}</div>
              </div>
              <div>
                <Label>Stock Anterior</Label>
                <div className="mt-1 text-gray-700">{item.prevStock}</div>
              </div>
              <div>
                <Label>Stock Nuevo</Label>
                <div className="mt-1 text-gray-700">{item.nextStock}</div>
              </div>
              <div>
                <Label>Usuario</Label>
                <div className="mt-1 text-gray-700">{item.user || 'N/A'}</div>
              </div>
              <div>
                <Label>Fecha</Label>
                <div className="mt-1 text-gray-700">{new Date(item.timestamp).toLocaleString('es-ES')}</div>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="gap-2">
          {onDelete && !isCreating && tableType === 'products' && (
            <Button
              variant="secondary"
              onClick={onDelete}
              disabled={isSaving}
              className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cerrar
          </Button>
          {tableType !== 'movements' && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={
                isSaving ||
                (tableType === 'products' && (!formData.name || !formData.category || !formData.baseUnit)) ||
                (tableType === 'inventory' && !inventoryFormData.productId)
              }
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
