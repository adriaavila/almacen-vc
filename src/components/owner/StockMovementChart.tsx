'use client';

import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StockMovementChartProps {
  startDate?: number;
  endDate?: number;
  groupBy?: 'day' | 'week' | 'month';
}

export function StockMovementChart({ startDate, endDate, groupBy = 'day' }: StockMovementChartProps) {
  const trends = useQuery(api.analytics.getMovementTrends, { startDate, endDate, groupBy });

  if (trends === undefined) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Movimientos de Stock</CardTitle>
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
          <CardTitle>Movimientos de Stock</CardTitle>
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
        <CardTitle>Movimientos de Stock</CardTitle>
        <CardDescription>Ingresos vs egresos a lo largo del tiempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="ingresos"
              stackId="1"
              stroke="#10b981"
              fill="url(#colorIngresos)"
              name="Ingresos"
            />
            <Area
              type="monotone"
              dataKey="egresos"
              stackId="2"
              stroke="#ef4444"
              fill="url(#colorEgresos)"
              name="Egresos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
