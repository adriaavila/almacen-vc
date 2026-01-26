'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as Id<'products'>;

  const product = useQuery(api.products.getWithInventory, productId ? { id: productId } : 'skip');
  const movements = useQuery(
    api.movements.getByProduct,
    productId ? { productId, limit: 20 } : 'skip'
  );

  const formatShortDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Get movement display info
  const getMovementInfo = (type: string) => {
    switch (type) {
      case 'COMPRA':
        return { label: 'Compra', isPositive: true, color: 'emerald' };
      case 'TRASLADO':
        return { label: 'Traslado', isPositive: false, color: 'blue' };
      case 'CONSUMO':
        return { label: 'Consumo', isPositive: false, color: 'red' };
      case 'AJUSTE':
        return { label: 'Ajuste', isPositive: true, color: 'yellow' };
      default:
        return { label: type, isPositive: false, color: 'gray' };
    }
  };

  // Loading state
  if (product === undefined || movements === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Cargando...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Error state - product not found
  if (product === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-red-600 mb-4">Producto no encontrado</p>
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/inventario')}
            >
              Volver a inventario
            </Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Calculate total stock and low stock status
  const almacenInventory = product.inventory?.find(inv => inv.location === 'almacen');
  const cafetinInventory = product.inventory?.find(inv => inv.location === 'cafetin');
  const totalStock = product.totalStock || 0;
  const almacenStock = almacenInventory?.stockActual || 0;
  const almacenMin = almacenInventory?.stockMinimo || 0;
  const cafetinStock = cafetinInventory?.stockActual || 0;
  const isLowStock = totalStock <= almacenMin;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/inventario')}
            className="mb-4"
          >
            ← Volver a inventario
          </Button>
        </div>

        {/* Header with Stock */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{product.name}</h1>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isLowStock ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                ></div>
                <Badge variant={isLowStock ? 'bajo-minimo' : 'ok'}>
                  {isLowStock ? 'Bajo Stock' : 'OK'}
                </Badge>
              </div>
              
              {/* Stock by Location */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Stock Almacén
                  </p>
                  <p
                    className={`text-4xl font-bold ${
                      almacenStock <= almacenMin ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {almacenStock}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.baseUnit} (mín: {almacenMin})
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Stock Cafetín
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {cafetinStock}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.baseUnit}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/movements/new')}
              className="h-12"
            >
              Registrar Ingreso
            </Button>
          </div>

          {/* Product Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Categoría</p>
              <p className="text-base text-gray-900">
                {product.category}
                {product.subCategory && ` • ${product.subCategory}`}
              </p>
            </div>
            {product.brand && product.brand !== '' && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Marca</p>
                <p className="text-base text-gray-900">{product.brand}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Unidad Base</p>
              <p className="text-base text-gray-900">{product.baseUnit}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Unidad de Compra</p>
              <p className="text-base text-gray-900">
                {product.purchaseUnit} ({product.conversionFactor} {product.baseUnit})
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Estado</p>
              <p className="text-base text-gray-900">
                {product.active ? 'Activo' : 'Inactivo'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Últimos Movimientos
            </h2>
          </div>

          {!movements || movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay movimientos registrados para este producto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => {
                const info = getMovementInfo(movement.type);
                const isPositive = movement.type === 'COMPRA' || 
                  (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
                
                return (
                  <div
                    key={movement._id}
                    className={`flex items-center justify-between p-4 rounded-md border ${
                      isPositive
                        ? 'bg-emerald-50 border-emerald-200'
                        : movement.type === 'TRASLADO'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isPositive
                            ? 'bg-emerald-500 text-white'
                            : movement.type === 'TRASLADO'
                            ? 'bg-blue-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {isPositive ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        ) : movement.type === 'TRASLADO' ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {info.label}
                          </p>
                          {movement.from && (
                            <span className="text-xs text-gray-500">
                              {movement.from} → {movement.to}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatShortDate(movement.timestamp)} • {movement.user}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p
                        className={`text-lg font-bold ${
                          isPositive ? 'text-emerald-700' : 
                          movement.type === 'TRASLADO' ? 'text-blue-700' : 'text-red-700'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {movement.quantity}
                      </p>
                      <p className="text-xs text-gray-500">{product.baseUnit}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
