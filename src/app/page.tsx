'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';

export default function Home() {
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
                <Link href="/requester/pedido?area=Cafetín">
                  <Button variant="primary" className="w-full py-3 text-base">
                    Cafetin
                  </Button>
                </Link>
                
                <Link href="/requester/pedido?area=Cocina">
                  <Button variant="primary" className="w-full py-3 text-base">
                    Cocina
                  </Button>
                </Link>
                
                <Link href="/requester/pedido?area=Limpieza">
                  <Button variant="primary" className="w-full py-3 text-base">
                    Limpieza
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Administración
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/mantenimiento">
                  <Button variant="secondary" className="w-full py-3 text-base">
                    Mantenimiento
                  </Button>
                </Link>
                <Link href="/admin/pedidos">
                  <Button variant="secondary" className="w-full py-3 text-base">
                    Admin
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
