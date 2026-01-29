'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Badge } from '@/components/ui/Badge';

type User = {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'requester' | 'mantenimiento';
  area: 'Cocina' | 'Cafetin' | 'Limpieza' | 'Mantenimiento' | 'Admin';
  activo: boolean;
};

// Mock data - en producción vendría de la BD
const mockUsers: User[] = [
  {
    id: '1',
    nombre: 'Juan Pérez',
    email: 'juan@vistacampo.com',
    rol: 'requester',
    area: 'Cafetin',
    activo: true,
  },
  {
    id: '2',
    nombre: 'María García',
    email: 'maria@vistacampo.com',
    rol: 'requester',
    area: 'Cocina',
    activo: true,
  },
  {
    id: '3',
    nombre: 'Carlos López',
    email: 'carlos@vistacampo.com',
    rol: 'admin',
    area: 'Admin',
    activo: true,
  },
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'requester' as User['rol'],
    area: 'Cafetin' as User['area'],
    activo: true,
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        area: user.area,
        activo: user.activo,
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        email: '',
        rol: 'requester',
        area: 'Cafetin',
        activo: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      nombre: '',
      email: '',
      rol: 'requester',
      area: 'Cafetin',
      activo: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      // Update existing user
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...formData, id: editingUser.id }
          : u
      ));
    } else {
      // Create new user
      const newUser: User = {
        ...formData,
        id: Date.now().toString(),
      };
      setUsers([...users, newUser]);
    }
    
    handleCloseModal();
  };

  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete));
      setUserToDelete(null);
    }
  };

  const getRolBadgeVariant = (rol: User['rol']): 'pendiente' | 'entregado' | 'bajo-minimo' | 'ok' => {
    switch (rol) {
      case 'admin':
        return 'bajo-minimo';
      case 'requester':
        return 'ok';
      case 'mantenimiento':
        return 'pendiente';
      default:
        return 'ok';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        <RequesterHeader 
          title="Usuarios"
          subtitle="Gestión de usuarios del sistema"
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área
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
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getRolBadgeVariant(user.rol)}>
                          {user.rol}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{user.area}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={user.activo ? 'ok' : 'pendiente'}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="text-emerald-600 hover:text-emerald-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="rol" className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                id="rol"
                required
                value={formData.rol}
                onChange={(e) => setFormData({ ...formData, rol: e.target.value as User['rol'] })}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="requester">Requester</option>
                <option value="admin">Admin</option>
                <option value="mantenimiento">Mantenimiento</option>
              </select>
            </div>

            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                Área
              </label>
              <select
                id="area"
                required
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value as User['area'] })}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="Cafetin">Cafetin</option>
                <option value="Cocina">Cocina</option>
                <option value="Limpieza">Limpieza</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                id="activo"
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 block text-sm text-gray-700">
                Usuario activo
              </label>
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
          isOpen={userToDelete !== null}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Eliminar usuario"
          message="¿Estás seguro de que deseas eliminar este usuario?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="destructive"
        />
      </PageContainer>
    </div>
  );
}
