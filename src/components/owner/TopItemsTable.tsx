'use client';

import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TopItemsTableProps {
  startDate?: number;
  endDate?: number;
  limit?: number;
}

export function TopItemsTable({ startDate, endDate, limit = 10 }: TopItemsTableProps) {
  const topItems = useQuery(api.analytics.getMostRequestedItems, { startDate, endDate, limit });

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(timestamp));
  };

  if (topItems === undefined) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Items Más Solicitados</CardTitle>
          <CardDescription>Carga de datos...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (topItems.length === 0) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Items Más Solicitados</CardTitle>
          <CardDescription>No hay datos para el período seleccionado</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Items Más Solicitados</CardTitle>
        <CardDescription>Top {limit} items por frecuencia de pedidos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-200">
                <TableHead className="font-semibold">Item</TableHead>
                <TableHead className="text-right font-semibold">Pedidos</TableHead>
                <TableHead className="text-right font-semibold">Cantidad Total</TableHead>
                <TableHead className="text-right font-semibold">Último Pedido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topItems.map((item, index) => (
                <TableRow
                  key={item.productId}
                  className="hover:bg-gray-50/50 transition-colors border-b border-gray-100"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-400 w-6">#{index + 1}</span>
                      <span>{item.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {item.orderCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{item.totalQuantity}</TableCell>
                  <TableCell className="text-right text-sm text-gray-600">
                    {formatDate(item.lastOrdered)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
