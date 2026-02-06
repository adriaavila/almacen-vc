'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { DateRangeFilter, getDateRangeTimestamps, type DateRange } from '@/components/owner/DateRangeFilter';
import { DashboardStats } from '@/components/owner/DashboardStats';
import { OrderTrendsChart } from '@/components/owner/OrderTrendsChart';
import { ConsumptionByAreaChart } from '@/components/owner/ConsumptionByAreaChart';
import { StockMovementChart } from '@/components/owner/StockMovementChart';
import { InventoryHealthChart } from '@/components/owner/InventoryHealthChart';
import { TopItemsTable } from '@/components/owner/TopItemsTable';
import { PendingOrdersAging } from '@/components/owner/PendingOrdersAging';
import { StockRunwayTable } from '@/components/owner/StockRunwayTable';
import { exportToCSV, formatDateRangeForFilename, formatDateRange } from '@/lib/export';

type Location = 'almacen' | 'cafetin';

export default function OwnerDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [location, setLocation] = useState<Location>('almacen');

  const { startDate, endDate } = useMemo(
    () => getDateRangeTimestamps(dateRange),
    [dateRange]
  );

  // Fetch all data needed for export
  const allOrders = useQuery(api.orders.list);
  const orderStats = useQuery(api.analytics.getOrderStats, { startDate, endDate });
  const consumption = useQuery(api.analytics.getConsumptionByArea, { startDate, endDate });
  const mostRequestedItems = useQuery(api.analytics.getMostRequestedItems, { startDate, endDate });

  const handleExport = useCallback(() => {
    if (!allOrders || !orderStats || !consumption || !mostRequestedItems) {
      alert('Espere a que los datos se carguen completamente');
      return;
    }

    // Filter orders by date range
    const filteredOrders = allOrders.filter((order) => {
      if (startDate && order.createdAt < startDate) return false;
      if (endDate && order.createdAt > endDate) return false;
      return true;
    });

    const exportData = {
      orders: filteredOrders.map((order) => ({
        ID: order._id,
        Área: order.area,
        Estado: order.status,
        'Fecha Creación': new Date(order.createdAt).toLocaleString('es-ES'),
      })),
      inventory: mostRequestedItems.map((item) => ({
        Item: item.nombre,
        'Pedidos': item.orderCount,
        'Cantidad Total': item.totalQuantity,
        'Último Pedido': new Date(item.lastOrdered).toLocaleDateString('es-ES'),
      })),
      consumption: {
        Cocina: consumption?.Cocina || 0,
        Cafetin: consumption?.Cafetin || 0,
        Limpieza: consumption?.Limpieza || 0,
      },
      metadata: {
        dateRange: formatDateRange(startDate, endDate),
        exportedAt: new Date().toLocaleString('es-ES'),
      },
    };

    const filename = `stock-runway_${formatDateRangeForFilename(startDate, endDate)}.csv`;
    exportToCSV(exportData, filename);
  }, [allOrders, orderStats, consumption, mostRequestedItems, startDate, endDate]);

  return (
    <PageContainer className="py-6 sm:py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              Stock Runway
            </h1>
            <p className="text-gray-500 mt-1">
              Análisis de cobertura y velocidad de consumo
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 rounded-xl"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Stock Runway Section - Main Focus */}
      <div className="mb-12">
        <StockRunwayTable location={location} onLocationChange={setLocation} />
      </div>

      {/* Additional Analytics - Collapsible Section */}
      <details className="group mb-12">
        <summary className="cursor-pointer flex items-center gap-2 text-lg font-semibold text-gray-700 mb-6 hover:text-teal-600 transition-colors">
          <svg
            className="w-5 h-5 transition-transform group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Métricas Adicionales
        </summary>

        {/* Date Range Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-md border border-gray-200/50 mb-6">
          <div className="mb-2 sm:mb-3">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              Período de análisis:
            </label>
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <DashboardStats startDate={startDate} endDate={endDate} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <OrderTrendsChart startDate={startDate} endDate={endDate} />
          <ConsumptionByAreaChart startDate={startDate} endDate={endDate} />
          <StockMovementChart startDate={startDate} endDate={endDate} />
          <InventoryHealthChart />
        </div>

        {/* Tables Section */}
        <div className="space-y-6">
          <TopItemsTable startDate={startDate} endDate={endDate} limit={10} />
          <PendingOrdersAging />
        </div>
      </details>
    </PageContainer>
  );
}
