'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';

// Inline Icons
function ChevronLeftIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    );
}

function ChevronRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}

function ClipboardIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}

// Helper to get week boundaries (Monday-Sunday)
function getWeekBoundaries(date: Date): { start: number; end: number; label: string } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday

    const monday = new Date(d);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Format label: "27 Ene - 2 Feb 2026"
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const startDay = monday.getDate();
    const startMonth = monthNames[monday.getMonth()];
    const endDay = sunday.getDate();
    const endMonth = monthNames[sunday.getMonth()];
    const year = sunday.getFullYear();

    const label = startMonth === endMonth
        ? `${startDay} - ${endDay} ${endMonth} ${year}`
        : `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;

    return {
        start: monday.getTime(),
        end: sunday.getTime(),
        label,
    };
}

export default function POSReportsPage() {
    // Week navigation state
    const [weekOffset, setWeekOffset] = useState(0);
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

    // Calculate current week boundaries
    const weekBoundaries = useMemo(() => {
        const today = new Date();
        today.setDate(today.getDate() + weekOffset * 7);
        return getWeekBoundaries(today);
    }, [weekOffset]);

    // Fetch report data
    const report = useQuery(api.analytics.getWeeklyPOSReport, {
        weekStart: weekBoundaries.start,
        weekEnd: weekBoundaries.end,
    });

    const isLoading = report === undefined;
    const isEmpty = report?.users.length === 0;

    // Handle Copy to Clipboard
    const handleCopy = (user: any) => {
        // Format: Product Name \t Quantity \t Unit
        const text = user.products
            .map((p: any) => `${p.productName}\t${p.quantity}\t${p.unit}`)
            .join('\n');

        // Add header optionally? No, raw data is better for immediate paste
        // Maybe prefix with user name?
        // Let's keep it simple: Name + newline + data
        const fullText = `Usuario: ${user.userName}\n\nProducto\tCantidad\tUnidad\n${text}`;

        navigator.clipboard.writeText(fullText).then(() => {
            setCopiedUserId(user.userId);
            setTimeout(() => setCopiedUserId(null), 2000);
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <PageContainer className="space-y-4 py-4">
                <RequesterHeader
                    title="Reporte Semanal"
                    subtitle="Consumo POS por Usuario"
                />

                {/* Week Selector */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setWeekOffset(prev => prev - 1)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Semana anterior"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </button>

                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-900">{weekBoundaries.label}</p>
                            {weekOffset === 0 && (
                                <p className="text-xs text-gray-500">Semana actual</p>
                            )}
                        </div>

                        <button
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            disabled={weekOffset >= 0}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Semana siguiente"
                        >
                            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                {!isLoading && !isEmpty && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900">{report.summary.totalUsers}</p>
                            <p className="text-xs text-gray-500">Usuarios</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900">{report.summary.totalProducts}</p>
                            <p className="text-xs text-gray-500">Productos</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900">{report.summary.totalQuantity}</p>
                            <p className="text-xs text-gray-500">Unidades</p>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                            <p>Cargando reporte...</p>
                        </div>
                    ) : isEmpty ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                            <p className="text-lg font-medium">Sin datos</p>
                            <p className="text-sm mt-1">No hay consumos POS registrados para esta semana</p>
                        </div>
                    ) : (
                        report.users.map((user) => (
                            <div key={user.userId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* User Header */}
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900">{user.userName}</h3>
                                        <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            {user.totalQuantity} items
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(user)}
                                        className="text-gray-500 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 group flex items-center gap-1.5"
                                        title="Copiar datos al portapapeles"
                                    >
                                        <span className="text-xs font-medium hidden sm:inline group-hover:block">
                                            {copiedUserId === user.userId ? 'Copiado' : 'Copiar'}
                                        </span>
                                        {copiedUserId === user.userId ? (
                                            <CheckIcon className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <ClipboardIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Products Table */}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Producto
                                                </th>
                                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                                    Cant.
                                                </th>
                                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                                    Unidad
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {user.products.map((product, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                                                        {product.productName}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium whitespace-nowrap">
                                                        {product.quantity}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                        {product.unit}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {/* Total Row (Optional) */}
                                        <tfoot className="bg-gray-50 border-t border-gray-200">
                                            <tr>
                                                <td className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                                                    Total
                                                </td>
                                                <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                                                    {user.totalQuantity}
                                                </td>
                                                <td className="px-4 py-2"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PageContainer>
        </div>
    );
}
