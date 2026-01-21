'use client';

import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export function PendingOrdersAging() {
  const aging = useQuery(api.analytics.getPendingOrdersAging);

  if (aging === undefined) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Pedidos Pendientes por Antigüedad</CardTitle>
          <CardDescription>Carga de datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-gray-100 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const totalPending = aging['0-1 day'].length + aging['1-3 days'].length + aging['3+ days'].length;

  if (totalPending === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Pedidos Pendientes por Antigüedad</CardTitle>
          <CardDescription>No hay pedidos pendientes</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const agingGroups = [
    {
      label: '0-1 día',
      count: aging['0-1 day'].length,
      orders: aging['0-1 day'],
      color: 'emerald',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
    },
    {
      label: '1-3 días',
      count: aging['1-3 days'].length,
      orders: aging['1-3 days'],
      color: 'amber',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
    },
    {
      label: '3+ días',
      count: aging['3+ days'].length,
      orders: aging['3+ days'],
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
    },
  ];

  const formatHours = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Pedidos Pendientes por Antigüedad</CardTitle>
        <CardDescription>Total: {totalPending} pedidos pendientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agingGroups.map((group) => (
            <div
              key={group.label}
              className={`${group.bgColor} ${group.borderColor} border-2 rounded-xl p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold ${group.textColor}`}>{group.label}</h3>
                <span className={`text-2xl font-bold ${group.textColor}`}>{group.count}</span>
              </div>
              {group.orders.length > 0 && (
                <div className="space-y-2">
                  {group.orders.slice(0, 3).map((order) => (
                    <Link
                      key={order._id}
                      href={`/admin/pedidos/${order._id}`}
                      className="block p-2 bg-white/60 rounded-lg hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{order.area}</span>
                        <span className="text-xs text-gray-600">{formatHours(order.ageHours)}</span>
                      </div>
                    </Link>
                  ))}
                  {group.orders.length > 3 && (
                    <p className="text-xs text-gray-600 text-center pt-2">
                      +{group.orders.length - 3} más
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
