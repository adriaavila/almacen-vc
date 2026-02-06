'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';

// Inline SVG Chevron Icons (to avoid external dependency)
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
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>Cargando reporte...</p>
                        </div>
                    ) : isEmpty ? (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-lg font-medium">Sin datos</p>
                            <p className="text-sm mt-1">No hay consumos POS registrados para esta semana</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {report.users.map((user) => (
                                <div key={user.userId} className="p-4">
                                    {/* User Header */}
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-900">{user.userName}</h3>
                                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                            {user.totalQuantity} items
                                        </span>
                                    </div>

                                    {/* Products Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                                                    <th className="pb-2">Producto</th>
                                                    <th className="pb-2 text-right">Cantidad</th>
                                                    <th className="pb-2 text-right">Unidad</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {user.products.map((product, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-1.5 text-gray-900">{product.productName}</td>
                                                        <td className="py-1.5 text-right font-medium text-gray-900">
                                                            {product.quantity}
                                                        </td>
                                                        <td className="py-1.5 text-right text-gray-500">
                                                            {product.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PageContainer>
        </div>
    );
}
