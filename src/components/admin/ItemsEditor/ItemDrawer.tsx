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

interface ItemDrawerProps {
  item: ConvexProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: Id<"products"> | null, data: Partial<ConvexProduct>) => Promise<void>;
  categories: string[];
  isCreating?: boolean;
}

export function ItemDrawer({
  item,
  isOpen,
  onClose,
  onSave,
  categories,
  isCreating = false,
}: ItemDrawerProps) {
  const [formData, setFormData] = useState<Partial<ConvexProduct>>({
    name: '',
    brand: '',
    category: '',
    subCategory: '',
    baseUnit: '',
    purchaseUnit: '',
    conversionFactor: 1,
    packageSize: 0,
    active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && !isCreating) {
      setFormData({
        name: item.name,
        brand: item.brand || '',
        category: item.category,
        subCategory: item.subCategory || '',
        baseUnit: item.baseUnit,
        purchaseUnit: item.purchaseUnit || '',
        conversionFactor: item.conversionFactor || 1,
        packageSize: item.packageSize || 0,
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
        packageSize: 0,
        active: true,
      });
    }
  }, [item, isCreating]);

  const handleSave = async () => {
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
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isCreating ? 'Crear nuevo producto' : `Editar: ${item?.name}`}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
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

          {/* Tamaño de Paquete */}
          <div>
            <Label htmlFor="packageSize">Tamaño de Paquete</Label>
            <Input
              id="packageSize"
              type="number"
              min="0"
              value={formData.packageSize || 0}
              onChange={(e) =>
                setFormData({ ...formData, packageSize: parseFloat(e.target.value) || 0 })
              }
              className="mt-1"
            />
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
        </div>

        <SheetFooter className="gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !formData.name || !formData.category || !formData.baseUnit}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
