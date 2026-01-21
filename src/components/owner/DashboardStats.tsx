'use client';

import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardStatsProps {
  startDate?: number;
  endDate?: number;
}

export function DashboardStats({ startDate, endDate }: DashboardStatsProps) {
  const orderStats = useQuery(api.analytics.getOrderStats, { startDate, endDate });
  const inventoryHealth = useQuery(api.analytics.getInventoryHealth);
  const movementStats = useQuery(api.analytics.getMovementStats, { startDate, endDate });
  const avgDeliveryTime = useQuery(api.analytics.getAverageDeliveryTime, { startDate, endDate });

  const stats = useMemo(() => {
    if (!orderStats || !inventoryHealth || !movementStats) {
      return null;
    }

    return {
      totalItems: inventoryHealth.total,
      lowStockPercentage: inventoryHealth.total > 0 
        ? Math.round((inventoryHealth.lowStock / inventoryHealth.total) * 100)
        : 0,
      totalOrders: orderStats.total,
      fulfillmentRate: Math.round(orderStats.fulfillmentRate * 100),
      avgDeliveryDays: avgDeliveryTime?.averageDays || 0,
      netStockChange: movementStats.netChange,
    };
  }, [orderStats, inventoryHealth, movementStats, avgDeliveryTime]);

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Items',
      value: stats.totalItems.toString(),
      subtitle: 'en inventario',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Bajo Stock',
      value: `${stats.lowStockPercentage}%`,
      subtitle: 'requieren atención',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      textColor: stats.lowStockPercentage > 20 ? 'text-amber-600' : 'text-gray-700',
    },
    {
      title: 'Pedidos Totales',
      value: stats.totalOrders.toString(),
      subtitle: 'en el período',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Tasa de Entrega',
      value: `${stats.fulfillmentRate}%`,
      subtitle: 'pedidos entregados',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10',
      textColor: stats.fulfillmentRate >= 80 ? 'text-emerald-600' : 'text-gray-700',
    },
    {
      title: 'Tiempo Promedio',
      value: stats.avgDeliveryDays > 0 ? `${stats.avgDeliveryDays.toFixed(1)} días` : 'N/A',
      subtitle: 'de entrega',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Cambio Neto',
      value: stats.netStockChange > 0 ? `+${stats.netStockChange}` : stats.netStockChange.toString(),
      subtitle: 'stock (ingresos - egresos)',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      gradient: stats.netStockChange >= 0 ? 'from-emerald-500 to-teal-500' : 'from-red-500 to-orange-500',
      bgColor: stats.netStockChange >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      textColor: stats.netStockChange >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statCards.map((stat, index) => (
        <Card
          key={stat.title}
          className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden group animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-3xl font-bold mb-1 ${stat.textColor || 'text-gray-900'}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-xl`}>
                <div className={`bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
