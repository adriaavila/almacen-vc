'use client';

import { Id } from 'convex/_generated/dataModel';
import { Slot, Paciente } from '@/types';
import { PatientSlider } from '@/components/ui/PatientSlider';
import { Button } from '@/components/ui/Button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

interface TicketPanelProps {
    open: boolean;
    onClose: () => void;
    slot: Slot;
    pacientes: Paciente[];
    activeSlotPacienteId: string | null;
    onPacienteChange: (pacienteId: string) => void;
    onDecreaseQuantity: (productId: Id<"products">) => void;
    onRemoveItem: (productId: Id<"products">) => void;
    onIncreaseQuantity: (productId: Id<"products">) => void;
    onRegisterSale: () => void;
    isRegistering: boolean;
}

export function TicketPanel({
    open,
    onClose,
    slot,
    pacientes,
    activeSlotPacienteId,
    onPacienteChange,
    onDecreaseQuantity,
    onRemoveItem,
    onIncreaseQuantity,
    onRegisterSale,
    isRegistering,
}: TicketPanelProps) {
    const totalItems = slot.items.reduce((sum, item) => sum + item.cantidad, 0);

    return (
        <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col p-0">
                {/* Header */}
                <SheetHeader className="border-b border-gray-100 px-5 py-4">
                    <SheetTitle className="text-lg font-bold text-gray-900">
                        Ticket · Orden #{slot.id}
                    </SheetTitle>
                    <p className="text-sm text-gray-500 text-center">
                        {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                    </p>
                </SheetHeader>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                    {slot.items.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            No hay productos en esta orden
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {slot.items.map((item) => (
                                <div
                                    key={item.productId}
                                    className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <p className="font-medium text-gray-900 text-sm truncate">{item.nombre}</p>
                                        <p className="text-xs text-gray-500">{item.unidad}</p>
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => onDecreaseQuantity(item.productId)}
                                            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:scale-90 transition-all"
                                            aria-label={`Restar ${item.nombre}`}
                                        >
                                            <span className="text-lg font-medium leading-none">−</span>
                                        </button>

                                        <span className="w-8 text-center font-bold text-gray-900 text-sm">
                                            {item.cantidad}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => onIncreaseQuantity(item.productId)}
                                            className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 active:scale-90 transition-all"
                                            aria-label={`Agregar ${item.nombre}`}
                                        >
                                            <span className="text-lg font-medium leading-none">+</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onRemoveItem(item.productId)}
                                            className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 active:scale-90 transition-all ml-1"
                                            aria-label={`Eliminar ${item.nombre}`}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Patient selector */}
                    {pacientes.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Asignar paciente
                            </p>
                            <PatientSlider
                                pacientes={pacientes}
                                activeSlotPacienteId={activeSlotPacienteId}
                                onPacienteChange={onPacienteChange}
                            />
                        </div>
                    )}
                </div>

                {/* Footer: Register button */}
                <div className="border-t border-gray-100 px-5 py-4 bg-white">
                    <Button
                        variant="primary"
                        className="w-full py-3.5 text-base font-bold rounded-xl"
                        onClick={() => {
                            onRegisterSale();
                            onClose();
                        }}
                        disabled={isRegistering || slot.items.length === 0}
                        loading={isRegistering}
                    >
                        {isRegistering ? 'Registrando...' : 'Registrar Venta'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
