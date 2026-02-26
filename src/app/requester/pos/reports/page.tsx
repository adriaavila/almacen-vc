'use client';

import { useState, useMemo } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { Copy, Check, Trash2, Edit2, X, Save } from 'lucide-react';
import { useUsersData } from '@/lib/hooks/useUsersData';

export default function ReportsPage() {
    // View Mode State
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');

    // Date State
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localDate = new Date(now.getTime() - offset);
        return localDate.toISOString().split('T')[0];
    });

    const [isSendingDaily, setIsSendingDaily] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
    const [editPatientName, setEditPatientName] = useState<string>('');
    const [isSavingPatient, setIsSavingPatient] = useState(false);

    // Fetch Users for Dropdown
    const users = useUsersData();
    const activeUsers = useMemo(() => {
        if (!users) return [];
        return users.filter(u => !u.isArchived).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [users]);

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

        const aggregation = new Map<string, {
            totalQty: number;
            products: Map<string, number>;
            tickets: { fecha: number; items: { producto: string; cantidad: number }[] }[];
        }>();

        salesReport.forEach(sale => {
            if (!aggregation.has(sale.paciente)) {
                aggregation.set(sale.paciente, { totalQty: 0, products: new Map(), tickets: [] });
            }
            const patientData = aggregation.get(sale.paciente)!;
            patientData.totalQty += sale.cantidad;

            const currentProdQty = patientData.products.get(sale.producto) || 0;
            patientData.products.set(sale.producto, currentProdQty + sale.cantidad);

            // Group by ticket inside the user's data
            let ticket = patientData.tickets.find(t => t.fecha === sale.fecha);
            if (!ticket) {
                ticket = { fecha: sale.fecha, items: [] };
                patientData.tickets.push(ticket);
            }
            ticket.items.push({ producto: sale.producto, cantidad: sale.cantidad });
        });

        // Sort tickets by date (newest first)
        aggregation.forEach(data => {
            data.tickets.sort((a, b) => b.fecha - a.fecha);
        });

        return Array.from(aggregation.entries()).map(([paciente, data]) => ({
            paciente,
            totalQty: data.totalQty,
            tickets: data.tickets,
            products: Array.from(data.products.entries()).map(([name, qty]) => `${name} (${qty})`).join(', ') // For copy
        })).sort((a, b) => a.paciente.localeCompare(b.paciente));
    }, [salesReport, viewMode]);

    // Group Data for Daily View
    const dailyGroupedByTicket = useMemo(() => {
        if (viewMode !== 'daily' || !salesReport) return [];

        const ticketsMap = new Map<number, {
            fecha: number;
            paciente: string;
            sentToN8n: boolean;
            items: { _id: string; producto: string; cantidad: number }[];
        }>();

        for (const sale of salesReport) {
            if (!ticketsMap.has(sale.fecha)) {
                ticketsMap.set(sale.fecha, {
                    fecha: sale.fecha,
                    paciente: sale.paciente,
                    sentToN8n: sale.sentToN8n,
                    items: []
                });
            }
            ticketsMap.get(sale.fecha)!.items.push({
                _id: sale._id,
                producto: sale.producto,
                cantidad: sale.cantidad
            });
        }

        // Return array sorted by fecha desc
        return Array.from(ticketsMap.values()).sort((a, b) => b.fecha - a.fecha);

    }, [salesReport, viewMode]);

    // Action to trigger daily send
    const triggerDailySend = useAction(api.billing.triggerDailySend);
    const deleteSale = useMutation(api.billing.deleteSale);
    const updateTicketUser = useMutation(api.billing.updateTicketUser);

    const handleDeleteSale = async (id: any) => {
        if (!confirm("¿Seguro que deseas eliminar este registro del reporte?")) return;
        try {
            await deleteSale({ id });
        } catch (error) {
            console.error("Error al eliminar el registro:", error);
            alert("Error al eliminar el registro");
        }
    };

    const handleSavePatient = async (fecha: number) => {
        if (!editPatientName) return;
        setIsSavingPatient(true);
        try {
            await updateTicketUser({ fecha, newPaciente: editPatientName });
            setEditingTicketId(null);
            setEditPatientName('');
        } catch (error) {
            console.error("Error updating patient:", error);
            alert("Error al actualizar usuario");
        } finally {
            setIsSavingPatient(false);
        }
    };

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
                                <div className="space-y-4">
                                    {dailyGroupedByTicket.map((ticket) => (
                                        <div key={ticket.fecha} className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                                            {/* Ticket Header */}
                                            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-gray-900">
                                                        {new Date(ticket.fecha).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>

                                                    {editingTicketId === ticket.fecha ? (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={editPatientName}
                                                                onChange={(e) => setEditPatientName(e.target.value)}
                                                                className="text-xs border-gray-300 rounded p-1 w-40"
                                                                autoFocus
                                                            >
                                                                <option value="" disabled>Seleccione usuario</option>
                                                                {activeUsers.map(u => (
                                                                    <option key={u._id} value={u.nombre}>{u.nombre}</option>
                                                                ))}
                                                                {/* Ensure current patient is in list in case they were archived or manually entered */}
                                                                {!activeUsers.find(u => u.nombre === ticket.paciente) && (
                                                                    <option value={ticket.paciente}>{ticket.paciente}</option>
                                                                )}
                                                            </select>
                                                            <button
                                                                onClick={() => handleSavePatient(ticket.fecha)}
                                                                disabled={isSavingPatient || !editPatientName}
                                                                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                                                title="Guardar"
                                                            >
                                                                <Save size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => { setEditingTicketId(null); setEditPatientName(''); }}
                                                                className="text-gray-500 hover:text-gray-700"
                                                                title="Cancelar"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-800">{ticket.paciente}</span>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingTicketId(ticket.fecha);
                                                                    setEditPatientName(ticket.paciente);
                                                                }}
                                                                className="text-gray-400 hover:text-emerald-600"
                                                                title="Editar usuario"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    {ticket.sentToN8n ? (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                            Enviado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">
                                                            Pendiente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Ticket Items */}
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-white">
                                                        <tr>
                                                            <th scope="col" className="px-3 py-1.5 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider w-12 bg-gray-50/50">
                                                                Ud.
                                                            </th>
                                                            <th scope="col" className="px-3 py-1.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
                                                                Producto
                                                            </th>
                                                            <th scope="col" className="px-3 py-1.5 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider w-10 bg-gray-50/50">
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {ticket.items.map((item) => (
                                                            <tr key={item._id} className="hover:bg-gray-50/50">
                                                                <td className="px-3 py-1.5 text-sm font-bold text-gray-900 text-right w-12">
                                                                    {item.cantidad}
                                                                </td>
                                                                <td className="px-3 py-1.5 text-sm text-gray-600">
                                                                    {item.producto}
                                                                </td>
                                                                <td className="px-3 py-1.5 whitespace-nowrap text-center p-0">
                                                                    <button
                                                                        onClick={() => handleDeleteSale(item._id)}
                                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                                                        title="Eliminar producto"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {weeklyAggregated.map((item, idx) => (
                                        <div key={idx} className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                                            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <h3 className="font-bold text-gray-900 text-sm">{item.paciente}</h3>
                                                    <span className="text-[10px] text-gray-500">{item.totalQty} items en total</span>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(`${item.totalQty} ${item.products}`, idx)}
                                                    className="text-gray-400 hover:text-emerald-600 p-1.5 rounded hover:bg-emerald-50 transition-colors bg-white border border-gray-200 shadow-sm"
                                                    title="Copiar consumo general"
                                                >
                                                    {copiedIndex === idx ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                </button>
                                            </div>

                                            <div className="divide-y divide-gray-100 bg-white">
                                                {item.tickets.map((ticket, tIdx) => (
                                                    <div key={tIdx} className="px-3 py-2">
                                                        <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/50 inline-block px-1.5 py-0.5 rounded mb-1">
                                                            {new Intl.DateTimeFormat('es-VE', {
                                                                weekday: 'short', month: 'short', day: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            }).format(new Date(ticket.fecha))}
                                                        </div>
                                                        <div className="pl-1">
                                                            {ticket.items.map((tItem, iIdx) => (
                                                                <div key={iIdx} className="flex justify-between items-center text-sm py-0.5">
                                                                    <span className="text-gray-600 flex-1">{tItem.producto}</span>
                                                                    <span className="font-bold text-gray-900 w-8 text-right">{tItem.cantidad}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
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
