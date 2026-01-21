'use client';

import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface OrderTrendsChartProps {
  startDate?: number;
  endDate?: number;
  groupBy?: 'day' | 'week' | 'month';
}

export function OrderTrendsChart({ startDate, endDate, groupBy = 'day' }: OrderTrendsChartProps) {
  const trends = useQuery(api.analytics.getOrderTrends, { startDate, endDate, groupBy });

  if (trends === undefined) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Tendencias de Pedidos</CardTitle>
          <CardDescription>Carga de datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (trends.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Tendencias de Pedidos</CardTitle>
          <CardDescription>No hay datos para el período seleccionado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatDate = (period: string) => {
    try {
      const date = new Date(period);
      if (groupBy === 'day') {
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      } else if (groupBy === 'week') {
        return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
      } else {
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      }
    } catch {
      return period;
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Tendencias de Pedidos</CardTitle>
        <CardDescription>Volumen de pedidos a lo largo del tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis
              dataKey="period"
              tickFormatter={formatDate}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px',
              }}
              labelFormatter={(label) => formatDate(label)}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              name="Total"
            />
            <Line
              type="monotone"
              dataKey="delivered"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ fill: '#14b8a6', r: 4 }}
              name="Entregados"
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', r: 4 }}
              name="Pendientes"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
