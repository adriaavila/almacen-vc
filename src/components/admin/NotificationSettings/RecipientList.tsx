import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Trash2, Edit2, Bell, BellOff, User, Check, X as XIcon } from "lucide-react";
import RecipientModal from "./RecipientModal";

export default function RecipientList() {
    const recipients = useQuery((api as any).notifications.list);
    const removeRecipient = useMutation((api as any).notifications.remove);
    const toggleRecipient = useMutation((api as any).notifications.toggle);
    const updateRecipient = useMutation((api as any).notifications.update);

    const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEdit = (recipient: any) => {
        setSelectedRecipient(recipient);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedRecipient(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: any) => {
        if (confirm("¿Estás seguro de eliminar este destinatario?")) {
            await removeRecipient({ id });
        }
    };

    if (recipients === undefined) return <div className="p-8 text-center text-gray-500">Cargando...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Destinatarios de Alertas</h2>
                    <p className="text-sm text-gray-500 mt-1">Gestiona quién recibe las notificaciones de Telegram</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <User className="w-4 h-4" />
                    Nuevo Destinatario
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-medium tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Nombre</th>
                            <th className="px-6 py-4">Chat ID</th>
                            <th className="px-6 py-4 text-center">Stock Bajo</th>
                            <th className="px-6 py-4 text-center">Pedidos</th>
                            <th className="px-6 py-4 text-center">Reporte Semanal</th>
                            <th className="px-6 py-4 text-center">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {recipients.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    No hay destinatarios configurados.
                                </td>
                            </tr>
                        ) : (

                            recipients.map((recipient: any) => (
                                <tr key={recipient._id} className={`hover:bg-gray-50 transition-colors ${recipient.isSystem ? "bg-gray-50/50" : ""}`}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                            {recipient.name}
                                            {recipient.isSystem && (
                                                <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] border border-blue-100 rounded-full font-semibold uppercase tracking-wide">
                                                    Sistema
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{recipient.chatId}</td>

                                    {/* Preferences Toggles (Visual only for now, can be made interactive if needed easily) */}
                                    <td className="px-6 py-4 text-center">
                                        {recipient.preferences.lowStock ? (
                                            <span className="inline-flex px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Sí</span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">No</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {recipient.preferences.newOrders ? (
                                            <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Sí</span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">No</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {recipient.preferences.weeklyReport ? (
                                            <span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Sí</span>
                                        ) : (
                                            <span className="inline-flex px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">No</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-center">
                                        {recipient.isSystem ? (
                                            <span className="text-gray-400" title="No se puede desactivar un destinatario del sistema">
                                                <Bell className="w-4 h-4 opacity-50" />
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => toggleRecipient({ id: recipient._id })}
                                                className={`p-1.5 rounded-full transition-colors ${recipient.enabled
                                                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                                                    : "bg-red-100 text-red-600 hover:bg-red-200"
                                                    }`}
                                                title={recipient.enabled ? "Desactivar" : "Activar"}
                                            >
                                                {recipient.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        {!recipient.isSystem && (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(recipient)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(recipient._id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <RecipientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                recipient={selectedRecipient}
            />
        </div>
    );
}
