'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Pencil as PencilIcon, Archive as ArchiveIcon } from "lucide-react";

type User = {
  _id: Id<"users">;
  nombre: string;
  fechaIngreso: number;
  estado: "Interno" | "Casas" | "Mantenimiento" | "Desconocido";
  isArchived: boolean;
};

export default function UsuariosPage() {
  const users = useQuery(api.users.get);
  const createUser = useMutation(api.users.create);
  const updateUser = useMutation(api.users.edit);
  const archiveUser = useMutation(api.users.archive);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToArchive, setUserToArchive] = useState<Id<"users"> | null>(null);

  // Default to today for new users
  const [formData, setFormData] = useState({
    nombre: '',
    fechaIngreso: new Date().toISOString().split('T')[0], // YYYY-MM-DD for input
    estado: 'Interno' as User['estado'],
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        fechaIngreso: new Date(user.fechaIngreso).toISOString().split('T')[0],
        estado: user.estado || 'Interno',
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        estado: 'Interno',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      nombre: '',
      fechaIngreso: new Date().toISOString().split('T')[0],
      estado: 'Interno',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse date safely
    const dateParts = formData.fechaIngreso.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // 0-indexed
    const day = parseInt(dateParts[2]);
    const fechaTimestamp = new Date(year, month, day, 12, 0, 0).getTime();

    if (editingUser) {
      await updateUser({
        id: editingUser._id,
        nombre: formData.nombre,
        estado: formData.estado,
      });
    } else {
      await createUser({
        nombre: formData.nombre,
        fechaIngreso: fechaTimestamp,
        estado: formData.estado,
      });
    }

    handleCloseModal();
  };

  const handleArchive = (userId: Id<"users">) => {
    setUserToArchive(userId);
  };

  const handleArchiveConfirm = async () => {
    if (userToArchive) {
      await archiveUser({ id: userToArchive });
      setUserToArchive(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        <RequesterHeader
          title="Usuarios"
          subtitle="Gestión de personal"
          actions={
            <Button
              variant="primary"
              onClick={() => handleOpenModal()}
            >
              Crear Usuario
            </Button>
          }
        />

        {/* Users Table */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Ingreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {!users ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Cargando...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(user.fechaIngreso)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.estado === 'Interno' ? 'bg-blue-100 text-blue-800' :
                            user.estado === 'Casas' ? 'bg-purple-100 text-purple-800' :
                              user.estado === 'Mantenimiento' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'}`}>
                          {user.estado || 'Desconocido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="text-emerald-600 hover:text-emerald-900 p-1 rounded-full hover:bg-emerald-50 transition-colors"
                            title="Editar"
                          >
                            <PencilIcon size={18} />
                          </button>
                          <button
                            onClick={() => handleArchive(user._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50 transition-colors"
                            title="Archivar"
                          >
                            <ArchiveIcon size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingUser ? 'Editar Usuario' : 'Crear Usuario'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                id="estado"
                required
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as User['estado'] })}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="Interno">Interno</option>
                <option value="Casas">Casas</option>
                <option value="Mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div>
              <label htmlFor="fechaIngreso" className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Ingreso
              </label>
              <input
                id="fechaIngreso"
                type="date"
                required
                disabled={!!editingUser} // Disable date editing if only name edit is supported/requested
                value={formData.fechaIngreso}
                onChange={(e) => setFormData({ ...formData, fechaIngreso: e.target.value })}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              {editingUser && <p className="text-xs text-gray-500 mt-1">La fecha de ingreso no se puede modificar.</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseModal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
              >
                {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={userToArchive !== null}
          onClose={() => setUserToArchive(null)}
          onConfirm={handleArchiveConfirm}
          title="Archivar usuario"
          message="¿Estás seguro de que deseas archivar este usuario? No aparecerá en la lista activa."
          confirmText="Archivar"
          cancelText="Cancelar"
          variant="destructive"
        />
      </PageContainer>
    </div>
  );
}
