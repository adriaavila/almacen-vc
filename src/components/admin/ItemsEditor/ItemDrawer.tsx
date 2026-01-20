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

interface ItemDrawerProps {
  item: ConvexItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: Id<"items"> | null, data: Partial<ConvexItem>) => Promise<void>;
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
  const [formData, setFormData] = useState<Partial<ConvexItem>>({
    nombre: '',
    categoria: '',
    subcategoria: '',
    marca: '',
    unidad: '',
    stock_actual: 0,
    stock_minimo: 0,
    package_size: '',
    location: '',
    extra_notes: '',
    active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && !isCreating) {
      setFormData({
        nombre: item.nombre,
        categoria: item.categoria,
        subcategoria: item.subcategoria || '',
        marca: item.marca || '',
        unidad: item.unidad,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        package_size: item.package_size || '',
        location: item.location,
        extra_notes: item.extra_notes || '',
        active: item.active,
      });
    } else {
      setFormData({
        nombre: '',
        categoria: '',
        subcategoria: '',
        marca: '',
        unidad: '',
        stock_actual: 0,
        stock_minimo: 0,
        package_size: '',
        location: '',
        extra_notes: '',
        active: true,
      });
    }
  }, [item, isCreating]);

  const handleSave = async () => {
    if (!formData.nombre || !formData.categoria || !formData.unidad) {
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
            {isCreating ? 'Crear nuevo item' : `Editar: ${item?.nombre}`}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Nombre */}
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre || ''}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Categoría */}
          <div>
            <Label htmlFor="categoria">Categoría *</Label>
            <Select
              value={formData.categoria || ''}
              onValueChange={(value) => setFormData({ ...formData, categoria: value })}
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
            <Label htmlFor="subcategoria">Subcategoría</Label>
            <Input
              id="subcategoria"
              value={formData.subcategoria || ''}
              onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Marca */}
          <div>
            <Label htmlFor="marca">Marca</Label>
            <Input
              id="marca"
              value={formData.marca || ''}
              onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Unidad */}
          <div>
            <Label htmlFor="unidad">Unidad *</Label>
            <Input
              id="unidad"
              value={formData.unidad || ''}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Stock Actual */}
          <div>
            <Label htmlFor="stock_actual">Stock Actual *</Label>
            <Input
              id="stock_actual"
              type="number"
              min="0"
              value={formData.stock_actual || 0}
              onChange={(e) =>
                setFormData({ ...formData, stock_actual: parseFloat(e.target.value) || 0 })
              }
              className="mt-1"
            />
          </div>

          {/* Stock Mínimo */}
          <div>
            <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
            <Input
              id="stock_minimo"
              type="number"
              min="0"
              value={formData.stock_minimo || 0}
              onChange={(e) =>
                setFormData({ ...formData, stock_minimo: parseFloat(e.target.value) || 0 })
              }
              className="mt-1"
            />
          </div>

          {/* Ubicación */}
          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Package Size */}
          <div>
            <Label htmlFor="package_size">Tamaño de Paquete</Label>
            <Input
              id="package_size"
              value={formData.package_size || ''}
              onChange={(e) => setFormData({ ...formData, package_size: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Extra Notes */}
          <div>
            <Label htmlFor="extra_notes">Notas Adicionales</Label>
            <textarea
              id="extra_notes"
              value={formData.extra_notes || ''}
              onChange={(e) => setFormData({ ...formData, extra_notes: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
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
              Item activo
            </Label>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !formData.nombre || !formData.categoria || !formData.unidad}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
