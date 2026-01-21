'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/layout/PageContainer';
import Image from 'next/image';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (authenticateAdmin(password)) {
      // Redirect to intended destination or default to pedidos
      const redirectPath = sessionStorage.getItem('admin_redirect') || '/admin/pedidos';
      sessionStorage.removeItem('admin_redirect');
      // Use replace to avoid adding to history
      // The AdminGuard will detect the auth change via the custom event
      router.replace(redirectPath);
    } else {
      setError('Contraseña incorrecta');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <div className="mb-8">
            <Image
              src="/logo-vistacampo.png"
              alt="Vistacampo Centro Terapéutico"
              width={240}
              height={80}
              className="h-20 w-auto"
              priority
            />
          </div>
          
          <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Acceso de Administrador
            </h1>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Ingresa la contraseña para acceder al panel de administración
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la contraseña"
                  className="w-full"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}
              
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading || !password}
              >
                {isLoading ? 'Verificando...' : 'Ingresar'}
              </Button>
            </form>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
