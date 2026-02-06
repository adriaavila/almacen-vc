'use client';

import { useState } from 'react';
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

type RunwayStatus = 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'STAGNANT';
type Location = 'almacen' | 'cafetin';

interface RunwayItem {
    productId: string;
    productName: string;
    stockCurrent: number;
    burnRate: number;
    daysRemaining: number | null;
    status: RunwayStatus;
}

interface RunwaySummary {
    criticalCount: number;
    warningCount: number;
    healthyCount: number;
    stagnantCount: number;
    averageDaysRemaining: number | null;
    totalProducts: number;
}

function StatusBadge({ status, daysRemaining }: { status: RunwayStatus; daysRemaining: number | null }) {
    const config = {
        CRITICAL: {
            bg: 'bg-gradient-to-r from-red-500 to-rose-500',
            text: 'text-white',
            label: daysRemaining !== null ? `${daysRemaining}d` : '!',
        },
        WARNING: {
            bg: 'bg-gradient-to-r from-amber-400 to-orange-400',
            text: 'text-white',
            label: daysRemaining !== null ? `${daysRemaining}d` : '⚠',
        },
        HEALTHY: {
            bg: 'bg-gradient-to-r from-emerald-400 to-teal-400',
            text: 'text-white',
            label: daysRemaining !== null ? `${daysRemaining}d` : '✓',
        },
        STAGNANT: {
            bg: 'bg-gray-200',
            text: 'text-gray-500',
            label: '∞',
        },
    };

    const { bg, text, label } = config[status];

    return (
        <span
            className={`inline-flex items-center justify-center min-w-[44px] px-2 py-1 rounded-lg text-xs font-bold ${bg} ${text}`}
        >
            {label}
        </span>
    );
}

function LocationToggle({
    value,
    onChange
}: {
    value: Location;
    onChange: (loc: Location) => void;
}) {
    return (
        <div className="inline-flex rounded-full bg-gray-100 p-1">
            <button
                onClick={() => onChange('almacen')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${value === 'almacen'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
            >
                🏭 Almacén
            </button>
            <button
                onClick={() => onChange('cafetin')}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${value === 'cafetin'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
            >
                ☕ Cafetín
            </button>
        </div>
    );
}

function KPICard({
    label,
    value,
    subtext,
    color,
    icon,
}: {
    label: string;
    value: string | number;
    subtext: string;
    color: 'red' | 'amber' | 'emerald' | 'gray';
    icon: string;
}) {
    const colorClasses = {
        red: 'from-red-500 to-rose-600',
        amber: 'from-amber-500 to-orange-600',
        emerald: 'from-emerald-500 to-teal-600',
        gray: 'from-gray-400 to-slate-500',
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]`}>
            <div className="flex items-center gap-2 mb-2 opacity-90">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
            </div>
            <div className="text-3xl sm:text-4xl font-bold tabular-nums">
                {value}
            </div>
            <div className="text-xs opacity-75 mt-1">{subtext}</div>
        </div>
    );
}

interface StockRunwayTableProps {
    location?: Location;
    onLocationChange?: (loc: Location) => void;
}

export function StockRunwayTable({ location: externalLocation, onLocationChange }: StockRunwayTableProps) {
    const [internalLocation, setInternalLocation] = useState<Location>('almacen');

    const location = externalLocation ?? internalLocation;
    const handleLocationChange = onLocationChange ?? setInternalLocation;

    const runwayData = useQuery(api.analytics.getInventoryRunway, { location });

    const locationLabel = location === 'almacen' ? 'Almacén' : 'Cafetín';
    const locationDescription = location === 'almacen'
        ? 'Consumo de Cocina y Limpieza'
        : 'Ventas del POS';

    if (runwayData === undefined) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">Stock Runway</h2>
                            <LocationToggle value={location} onChange={handleLocationChange} />
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{locationDescription}</p>
                    </div>
                </div>

                {/* Loading KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse" />
                    ))}
                </div>

                {/* Loading Table */}
                <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const summary: RunwaySummary = runwayData.summary;

    return (
        <div className="space-y-6">
            {/* Header with Location Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-bold text-gray-900">Stock Runway</h2>
                        <LocationToggle value={location} onChange={handleLocationChange} />
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        {locationDescription} • Últimos 30 días
                    </p>
                </div>
            </div>

            {/* KPI Cards with Gradient Backgrounds */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    icon="🚨"
                    label="Críticos"
                    value={summary.criticalCount}
                    subtext="< 10 días"
                    color="red"
                />
                <KPICard
                    icon="⚠️"
                    label="En Alerta"
                    value={summary.warningCount}
                    subtext="10-30 días"
                    color="amber"
                />
                <KPICard
                    icon="📊"
                    label="Promedio"
                    value={summary.averageDaysRemaining !== null ? `${summary.averageDaysRemaining}d` : '—'}
                    subtext="cobertura"
                    color="emerald"
                />
                <KPICard
                    icon="💤"
                    label="Sin Consumo"
                    value={summary.stagnantCount}
                    subtext="30 días"
                    color="gray"
                />
            </div>

            {/* Product Table */}
            <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-800">
                                Detalle por Producto
                            </CardTitle>
                            <CardDescription className="text-gray-500">
                                {summary.totalProducts} productos en {locationLabel.toLowerCase()}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {runwayData.items.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-3">📦</div>
                            <p className="text-gray-500">No hay productos con stock en {locationLabel.toLowerCase()}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-100">
                                        <TableHead className="font-semibold text-gray-600 pl-6 w-[40%]">Producto</TableHead>
                                        <TableHead className="text-center font-semibold text-gray-600 w-[20%]">Stock</TableHead>
                                        <TableHead className="text-center font-semibold text-gray-600 w-[20%]">Velocidad</TableHead>
                                        <TableHead className="text-center font-semibold text-gray-600 pr-6 w-[20%]">Runway</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {runwayData.items.map((item: RunwayItem, index: number) => (
                                        <TableRow
                                            key={item.productId}
                                            className={`transition-colors border-b border-gray-50 ${item.status === 'CRITICAL' ? 'bg-red-50/30 hover:bg-red-50/50' :
                                                    item.status === 'WARNING' ? 'bg-amber-50/30 hover:bg-amber-50/50' :
                                                        'hover:bg-gray-50/50'
                                                }`}
                                        >
                                            <TableCell className="font-medium text-gray-900 pl-6">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-xs w-5">{index + 1}.</span>
                                                    <span className="truncate">{item.productName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center tabular-nums font-semibold text-gray-700">
                                                {item.stockCurrent}
                                            </TableCell>
                                            <TableCell className="text-center text-sm text-gray-500 tabular-nums">
                                                {item.burnRate > 0 ? (
                                                    <span>{item.burnRate}<span className="text-gray-400">/d</span></span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center pr-6">
                                                <StatusBadge status={item.status} daysRemaining={item.daysRemaining} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
