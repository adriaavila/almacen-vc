'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';

export default function Home() {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Almacén - Control de Stock
          </h1>
          <p className="text-lg text-gray-600 mb-12 text-center max-w-md">
            Sistema de control de stock y pedidos internos
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md">
            <Link href="/requester/pedido" className="flex-1">
              <Button variant="primary" className="w-full py-4 text-lg">
                Entrar como Solicitante
              </Button>
            </Link>
            
            <Link href="/admin/pedidos" className="flex-1">
              <Button variant="secondary" className="w-full py-4 text-lg">
                Entrar como Admin
              </Button>
            </Link>
          </div>
          
          <div className="mt-12 text-sm text-gray-500 text-center max-w-md">
            <p>Selecciona tu rol para acceder al sistema</p>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
