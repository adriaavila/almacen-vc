'use client';

import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ConsumptionByAreaChartProps {
  startDate?: number;
  endDate?: number;
}

const COLORS = {
  Cocina: '#10b981',
  Cafetín: '#14b8a6',
  Limpieza: '#f59e0b',
};

export function ConsumptionByAreaChart({ startDate, endDate }: ConsumptionByAreaChartProps) {
  const consumption = useQuery(api.analytics.getConsumptionByArea, { startDate, endDate });

  if (consumption === undefined) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Consumo por Área</CardTitle>
          <CardDescription>Carga de datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Map ASCII-safe keys to display names
  const data = [
    { name: 'Cocina', cantidad: consumption.Cocina || 0 },
    { name: 'Cafetín', cantidad: consumption.Cafetin || 0 },
    { name: 'Limpieza', cantidad: consumption.Limpieza || 0 },
  ];

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Consumo por Área</CardTitle>
        <CardDescription>Cantidad total consumida por área</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px',
              }}
              formatter={(value: number | undefined) => [`${value ?? 0} unidades`, 'Cantidad']}
            />
            <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
