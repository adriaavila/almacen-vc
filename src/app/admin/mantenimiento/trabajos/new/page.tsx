'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ActivoAutocomplete } from '@/components/ui/ActivoAutocomplete';
import { RepuestoAutocomplete } from '@/components/ui/RepuestoAutocomplete';

interface RepuestoConsumo {
  repuesto_id: Id<'repuestos'>;
  repuesto: any;
  cantidad: string;
}

export default function NewTrabajoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createTrabajo = useMutation(api.trabajosMantenimiento.create);

  const [activoId, setActivoId] = useState<Id<'activos'> | null>(null);
  const [activo, setActivo] = useState<any>(null);
  const [tipo, setTipo] = useState<'preventivo' | 'correctivo' | 'emergencia'>('preventivo');
  const [descripcion, setDescripcion] = useState<string>('');
  const [tecnico, setTecnico] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [repuestos, setRepuestos] = useState<RepuestoConsumo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Set activo from URL param if present
  useEffect(() => {
    const activoParam = searchParams?.get('activo');
    if (activoParam) {
      // We'll need to fetch the activo, but for now just set the ID
      // In a real implementation, you'd fetch it here
      setActivoId(activoParam as Id<'activos'>);
    }
  }, [searchParams]);

  const handleActivoChange = (id: Id<'activos'> | null, activoData: any) => {
    setActivoId(id);
    setActivo(activoData);
  };

  const handleAddRepuesto = () => {
    setRepuestos([
      ...repuestos,
      {
        repuesto_id: '' as Id<'repuestos'>,
        repuesto: null,
        cantidad: '',
      },
    ]);
  };

  const handleRepuestoChange = (index: number, repuestoId: Id<'repuestos'> | null, repuestoData: any) => {
    const newRepuestos = [...repuestos];
    newRepuestos[index] = {
      ...newRepuestos[index],
      repuesto_id: repuestoId || ('' as Id<'repuestos'>),
      repuesto: repuestoData,
    };
    setRepuestos(newRepuestos);
  };

  const handleCantidadChange = (index: number, cantidad: string) => {
    const newRepuestos = [...repuestos];
    newRepuestos[index] = {
      ...newRepuestos[index],
      cantidad,
    };
    setRepuestos(newRepuestos);
  };

  const handleRemoveRepuesto = (index: number) => {
    setRepuestos(repuestos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!activoId) {
      setToast({
        message: 'Por favor selecciona un activo',
        type: 'error',
      });
      return;
    }

    if (!descripcion.trim()) {
      setToast({
        message: 'Por favor ingresa una descripción',
        type: 'error',
      });
      return;
    }

    // Validate repuestos
    const repuestosToConsume = repuestos
      .filter((r) => r.repuesto_id && r.cantidad)
      .map((r) => {
        const cantidad = parseFloat(r.cantidad);
        if (isNaN(cantidad) || cantidad <= 0) {
          throw new Error(`Cantidad inválida para ${r.repuesto?.nombre || 'repuesto'}`);
        }
        return {
          repuesto_id: r.repuesto_id,
          cantidad,
        };
      });

    setIsSubmitting(true);

    try {
      await createTrabajo({
        activo_id: activoId,
        tipo,
        descripcion: descripcion.trim(),
        tecnico: tecnico.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        repuestos: repuestosToConsume.length > 0 ? repuestosToConsume : undefined,
      });

      setToast({
        message: 'Trabajo creado exitosamente',
        type: 'success',
      });

      // Redirect after short delay
      setTimeout(() => {
        router.push('/admin/mantenimiento/trabajos');
      }, 1500);
    } catch (error: any) {
      console.error('Error al crear trabajo:', error);
      setToast({
        message: error.message || 'No se pudo crear el trabajo. Intente de nuevo.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Volver
          </Button>
          <p className="text-sm text-gray-500">
            Registrar un nuevo trabajo o arreglo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Activo */}
          <div>
            <label htmlFor="activo" className="block text-sm font-medium text-gray-700 mb-2">
              Activo *
            </label>
            <ActivoAutocomplete
              value={activoId}
              onChange={handleActivoChange}
              placeholder="Buscar activo..."
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo *
            </label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipo"
                  value="preventivo"
                  checked={tipo === 'preventivo'}
                  onChange={(e) => setTipo(e.target.value as 'preventivo')}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Preventivo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipo"
                  value="correctivo"
                  checked={tipo === 'correctivo'}
                  onChange={(e) => setTipo(e.target.value as 'correctivo')}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Correctivo</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipo"
                  value="emergencia"
                  checked={tipo === 'emergencia'}
                  onChange={(e) => setTipo(e.target.value as 'emergencia')}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Emergencia</span>
              </label>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el trabajo a realizar..."
              required
              rows={4}
              className="block w-full px-4 py-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Técnico */}
          <div>
            <label htmlFor="tecnico" className="block text-sm font-medium text-gray-700 mb-2">
              Técnico <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="tecnico"
              type="text"
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              placeholder="Nombre del técnico responsable"
              className="block w-full h-12 px-4 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Repuestos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Repuestos a consumir
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddRepuesto}
                className="text-xs px-3 py-1 h-auto"
              >
                + Agregar Repuesto
              </Button>
            </div>
            {repuestos.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No se han agregado repuestos</p>
            ) : (
              <div className="space-y-3">
                {repuestos.map((repuesto, index) => (
                  <div
                    key={index}
                    className="flex gap-3 items-start p-3 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <div className="flex-1">
                      <RepuestoAutocomplete
                        value={repuesto.repuesto_id || null}
                        onChange={(id, data) => handleRepuestoChange(index, id, data)}
                        placeholder="Buscar repuesto..."
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={repuesto.cantidad}
                        onChange={(e) => handleCantidadChange(index, e.target.value)}
                        placeholder="Cantidad"
                        className="block w-full h-12 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      {repuesto.repuesto && (
                        <p className="text-xs text-gray-500 mt-1">{repuesto.repuesto.unidad}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleRemoveRepuesto(index)}
                      className="text-xs px-3 py-1 h-auto"
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales..."
              rows={3}
              className="block w-full px-4 py-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !activoId || !descripcion.trim()}
              className="h-12"
            >
              {isSubmitting ? 'Creando...' : 'Crear Trabajo'}
            </Button>
          </div>
        </form>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isOpen={!!toast}
            onClose={() => setToast(null)}
          />
        )}
      </PageContainer>
    </div>
  );
}
