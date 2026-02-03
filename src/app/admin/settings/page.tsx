"use client";

import RecipientList from "@/components/admin/NotificationSettings/RecipientList";

export default function ConfigurationPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8 pl-1">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración</h1>
                <p className="text-gray-500 mt-2 text-lg">Administra las preferencias generales del sistema</p>
            </div>

            <div className="space-y-8">
                {/* Sección de Notificaciones */}
                <RecipientList />

                {/* Aquí se pueden añadir más secciones de configuración en el futuro */}
            </div>
        </div>
    );
}
