import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { X, Save, AlertCircle } from "lucide-react";

interface Recipient {
    _id?: string;
    name: string;
    chatId: string;
    isAdmin: boolean;
    preferences: {
        lowStock: boolean;
        weeklyReport: boolean;
        newOrders: boolean;
    };
}

interface RecipientModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipient?: Recipient | null; // If null, mode is Create
}

export default function RecipientModal({ isOpen, onClose, recipient }: RecipientModalProps) {
    const createRecipient = useMutation((api as any).notifications.create);
    const updateRecipient = useMutation((api as any).notifications.update);

    const [formData, setFormData] = useState<Recipient>({
        name: "",
        chatId: "",
        isAdmin: false,
        preferences: {
            lowStock: true,
            weeklyReport: true,
            newOrders: false,
        },
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (recipient) {
            setFormData(recipient);
        } else {
            setFormData({
                name: "",
                chatId: "",
                isAdmin: false,
                preferences: {
                    lowStock: true,
                    weeklyReport: true,
                    newOrders: false,
                },
            });
        }
        setError("");
    }, [recipient, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (recipient?._id) {
                await updateRecipient({
                    id: recipient._id as any,
                    name: formData.name,
                    chatId: formData.chatId,
                    isAdmin: formData.isAdmin,
                    preferences: formData.preferences,
                });
            } else {
                await createRecipient({
                    name: formData.name,
                    chatId: formData.chatId,
                    isAdmin: formData.isAdmin,
                    preferences: formData.preferences,
                });
            }
            onClose();
        } catch (err: any) {
            setError(err.message || "Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {recipient ? "Editar Destinatario" : "Nuevo Destinatario"}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nombre</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Ej: Juan Perez"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Chat ID (Telegram)</label>
                        <input
                            type="text"
                            required
                            value={formData.chatId}
                            onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Ej: 123456789"
                        />
                        <p className="text-xs text-gray-500">
                            El usuario debe haber iniciado el bot previamente para obtener su ID.
                        </p>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="text-sm font-medium text-gray-700 block">Notificaciones</label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.preferences.lowStock}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        preferences: { ...formData.preferences, lowStock: e.target.checked },
                                    })
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Alerta de Stock Bajo</span>
                                <span className="block text-xs text-gray-500">Recibir alertas en tiempo real</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.preferences.weeklyReport}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        preferences: { ...formData.preferences, weeklyReport: e.target.checked },
                                    })
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-medium text-gray-900">Reporte Semanal</span>
                                <span className="block text-xs text-gray-500">Resumen de reposición (Lunes 8am)</span>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Guardando..." : <><Save className="w-4 h-4" /> Guardar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
