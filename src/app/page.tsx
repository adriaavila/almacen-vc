'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { setUserArea } from '@/lib/auth';
import { Area } from '@/types';

export default function Home() {
  const router = useRouter();

  const handleAreaClick = (area: Area) => {
    setUserArea(area);
    router.push(`/requester/pedido?area=${area}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
          <div className="mb-6">
            <Image
              src="/logo-vistacampo.png"
              alt="Vistacampo Centro Terapéutico"
              width={240}
              height={80}
              className="h-16 w-auto"
              priority
            />
          </div>
          <p className="text-base text-gray-600 mb-8 text-center max-w-md">
            Operaciones Internas Vistacampo
          </p>
          
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Áreas Operativas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  variant="primary" 
                  className="w-full py-3 text-base"
                  onClick={() => handleAreaClick('Cafetín')}
                >
                  Cafetin
                </Button>
                
                <Button 
                  variant="primary" 
                  className="w-full py-3 text-base"
                  onClick={() => handleAreaClick('Cocina')}
                >
                  Cocina
                </Button>
                
                <Button 
                  variant="primary" 
                  className="w-full py-3 text-base"
                  onClick={() => handleAreaClick('Limpieza')}
                >
                  Limpieza
                </Button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Administración
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button 
                  variant="secondary" 
                  className="w-full py-3 text-base"
                  onClick={() => router.push('/mantenimiento')}
                >
                  Mantenimiento
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full py-3 text-base"
                  onClick={() => router.push('/admin/pedidos')}
                >
                  Admin
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
