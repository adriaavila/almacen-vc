'use client';

import { useState, useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { Copy, Check } from 'lucide-react';

export default function ReportsPage() {
    // View Mode State
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

    // Date State
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDate = new Date(now.getTime() - offset);
        return localDate.toISOString().split('T')[0];
    });

    const [isSendingDaily, setIsSendingDaily] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Calculate Date Range based on View Mode
    const dateRange = useMemo(() => {
        const anchor = new Date(selectedDate + "T12:00:00");

        if (viewMode === 'daily') {
            const start = new Date(anchor);
            start.setHours(0, 0, 0, 0);
            const end = new Date(anchor);
            end.setHours(23, 59, 59, 999);
            return { start: start.getTime(), end: end.getTime() };
        } else {
            // Weekly: Monday to Sunday
            const day = anchor.getDay();
            const diff = anchor.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            const monday = new Date(anchor);
            monday.setDate(diff);
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            // Format label DD/MM
            const format = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
            return {
                start: monday.getTime(),
                end: sunday.getTime(),
                label: `${format(monday)} - ${format(sunday)}`
            };
        }
    }, [selectedDate, viewMode]);

    // Fetch Data
    const salesReport = useQuery(api.billing.getSalesByDateRange, {
        startDate: dateRange.start,
        endDate: dateRange.end
    });

    // Aggregate Data for Weekly View
    const weeklyAggregated = useMemo(() => {
        if (viewMode !== 'weekly' || !salesReport) return [];

        const aggregation = new Map<string, { totalQty: number; products: Map<string, number> }>();

        salesReport.forEach(sale => {
            if (!aggregation.has(sale.paciente)) {
                aggregation.set(sale.paciente, { totalQty: 0, products: new Map() });
            }
            const patientData = aggregation.get(sale.paciente)!;
            patientData.totalQty += sale.cantidad;

            const currentProdQty = patientData.products.get(sale.producto) || 0;
            patientData.products.set(sale.producto, currentProdQty + sale.cantidad);
        });

        return Array.from(aggregation.entries()).map(([paciente, data]) => ({
            paciente,
            totalQty: data.totalQty,
            products: Array.from(data.products.entries()).map(([name, qty]) => `${name} (${qty})`).join(', ')
        })).sort((a, b) => a.paciente.localeCompare(b.paciente));
    }, [salesReport, viewMode]);

    // Action to trigger daily send
    const triggerDailySend = useAction(api.billing.triggerDailySend);

    const handleDailyClose = async () => {
        if (!confirm("¿Seguro que deseas cerrar el día y enviar el reporte?")) {
            return;
        }

        setIsSendingDaily(true);
        try {
            const result = await triggerDailySend();
            if (result.success) {
                alert(result.message || "Reporte enviado exitosamente");
            } else {
                alert("Error: " + result.error);
            }
        } catch (error) {
            console.error("Error sending daily report:", error);
            alert("Error al enviar el reporte diario");
        } finally {
            setIsSendingDaily(false);
        }
    };

    const shiftDate = (amount: number) => {
        const current = new Date(selectedDate + "T12:00:00");
        const daysToAdd = viewMode === 'weekly' ? amount * 7 : amount;
        current.setDate(current.getDate() + daysToAdd);
        const offset = current.getTimezoneOffset() * 60000;
        const localDate = new Date(current.getTime() - offset);
        setSelectedDate(localDate.toISOString().split('T')[0]);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedDate(e.target.value);
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden w-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 space-y-2">

                {/* Header Area */}
                <div className="flex flex-col gap-2 border-b border-gray-200 pb-2">
                    {/* Top Row: Title + Toggle compacted */}
                    <div className="relative flex items-center justify-center min-h-[44px]">
                        <div className="text-center">
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">Reportes</h1>
                            <p className="text-xs text-gray-500">Cierre de Cafetín</p>
                        </div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex bg-gray-100 rounded p-1 gap-1 shrink-0">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'daily' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Diario
                            </button>
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === 'weekly' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Semanal
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-2 mt-1">
                        {/* Navigation Controls */}
                        <div className="flex items-center gap-1 w-full max-w-sm">
                            <button
                                onClick={() => shiftDate(-1)}
                                className="p-1.5 hover:bg-gray-100 text-gray-600 rounded border border-gray-300 bg-white h-8 w-8 flex items-center justify-center shrink-0"
                                aria-label="Anterior"
                            >
                                &lt;
                            </button>

                            <div className="flex-1 min-w-0 mx-1">
                                {viewMode === 'daily' ? (
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={handleDateChange}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 h-8 bg-white"
                                    />
                                ) : (
                                    <div className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white h-8 flex items-center justify-center font-medium text-gray-700">
                                        {(dateRange as any).label}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => shiftDate(1)}
                                className="p-1.5 hover:bg-gray-100 text-gray-600 rounded border border-gray-300 bg-white h-8 w-8 flex items-center justify-center shrink-0"
                                aria-label="Siguiente"
                            >
                                &gt;
                            </button>
                        </div>

                        {viewMode === 'daily' && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDailyClose}
                                disabled={isSendingDaily}
                                className="text-xs px-3 py-0 h-8 font-medium whitespace-nowrap ml-auto shrink-0"
                            >
                                {isSendingDaily ? "Enviando..." : "Cerrar día"}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white rounded-md shadow-sm border border-gray-200">
                    {!salesReport ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Cargando reporte...
                        </div>
                    ) : salesReport.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2 p-4 text-center">
                            <p className="text-sm">No hay ventas registradas en este periodo.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto bg-gray-50 p-2 sm:p-4 space-y-4">
                            {viewMode === 'daily' ? (
                                <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                                    Hora
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Paciente
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                    Cant.
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Producto
                                                </th>
                                                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                                    Estado
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {salesReport.map((sale) => (
                                                <tr key={sale._id} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                                        {new Date(sale.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {sale.paciente}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-bold text-right">
                                                        {sale.cantidad}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                                        {sale.producto}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap text-center">
                                                        {sale.sentToN8n ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                                Enviado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                                                                Pendiente
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {weeklyAggregated.map((item, idx) => (
                                        <div key={idx} className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                                <h3 className="font-bold text-gray-900 text-sm">{item.paciente}</h3>
                                                <button
                                                    onClick={() => copyToClipboard(`${item.totalQty} ${item.products}`, idx)}
                                                    className="text-gray-400 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50 transition-colors"
                                                    title="Copiar consumo"
                                                >
                                                    {copiedIndex === idx ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                                </button>
                                            </div>
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-white">
                                                    <tr>
                                                        <th scope="col" className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16 bg-gray-50/50">
                                                            Cant.
                                                        </th>
                                                        <th scope="col" className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                                            Producto
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {/* Parse the product string back to rows for display */}
                                                    {item.products.split(', ').map((prodStr, i) => {
                                                        const match = prodStr.match(/(.*) \((\d+)\)/);
                                                        if (match) {
                                                            return (
                                                                <tr key={i}>
                                                                    <td className="px-3 py-1.5 text-sm font-bold text-gray-900 text-right w-16">
                                                                        {match[2]}
                                                                    </td>
                                                                    <td className="px-3 py-1.5 text-sm text-gray-600">
                                                                        {match[1]}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                    <tr className="bg-gray-50/30 border-t border-gray-200">
                                                        <td className="px-3 py-1.5 text-sm font-black text-gray-900 text-right w-16">
                                                            {item.totalQty}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Total Items
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Summary */}
                    {salesReport && salesReport.length > 0 && (
                        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex justify-between items-center text-xs sm:text-sm shrink-0">
                            <span className="text-gray-500">Total registros: <span className="font-semibold text-gray-900">{salesReport.length}</span></span>
                            {viewMode === 'daily' && (
                                <span className="text-gray-500">
                                    Pendientes: <span className="font-semibold text-gray-900">{salesReport.filter(s => !s.sentToN8n).length}</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
