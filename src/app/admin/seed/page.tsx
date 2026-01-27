'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';

const CAFETIN_PRODUCTS = [
  { "name": "Agua 600ml", "baseUnit": "Botella", "subCategory": "Bebida", "category": "Cafetin" },
  { "name": "Barrita labial valmy 4g", "baseUnit": "Barrita", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Bom bom bum chupeta", "baseUnit": "Unidad", "subCategory": "Chupetas", "category": "Cafetin" },
  { "name": "Borocanfor cool 35gr", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Borocanfor cool 60gr", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Brawnies", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Carre 25g", "baseUnit": "Unidad", "subCategory": "Dulces", "category": "Cafetin" },
  { "name": "Cepillo dental colgate 360", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Cepillos dental colgate zigzag", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Champu head shoulders 2 en 1", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Champu head shoulders limpieza renovadora", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Champu pantene bambu 200 ml", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Cheestris", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Cigarrillos belmont", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" },
  { "name": "Cigarrillos lucky", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" },
  { "name": "Club social galleta", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Cocosette galleta", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Colgate original 100g", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Colgate total 12 anti sarro", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Colgate total 12 encias", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Crema corp milk nutri 100ml", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Crema dental oral b", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Crema dental oral b white", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Crema humect lubriderm 120ml", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" },
  { "name": "Crema nivea expres 100 ml", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Cricri 30g", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" },
  { "name": "Cricri 60g", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Dandy", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Deso dove tono uniforme", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodo aero axe dart y tono uni", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodorante barra dove original", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodorante barra every nith", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" },
  { "name": "Desodorante barra leidy speed stick", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodorante dove men invi", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodorante leidy speed stick rolon", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodorante rexona barra", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Desodorante leidy speed stick aerosol", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" },
  { "name": "Detodito", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Doritos", "baseUnit": "Unidad", "subCategory": "Bolsitas", "category": "Cafetin" },
  { "name": "Enguague bucal colgate glacial", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Enguague bucal colgate plax 250ml", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Flaquitos", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Flips 120g", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Fregeells caramelos", "baseUnit": "Unidad", "subCategory": "Caramelos", "category": "Cafetin" },
  { "name": "Galak 30g", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Gatorade 500 ml", "baseUnit": "Unidad", "subCategory": "Bebida", "category": "Cafetin" },
  { "name": "Gel fijador every night", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Gel rolda", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Gomitas play surtidas", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Gotmucho", "baseUnit": "Unidad", "subCategory": "Tubo", "category": "Cafetin" },
  { "name": "Halls caramelos", "baseUnit": "Unidad", "subCategory": "Caramelos", "category": "Cafetin" },
  { "name": "Hilo dental colgate", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Hony y kraker", "baseUnit": "Unidad", "subCategory": "Galleta", "category": "Cafetin" },
  { "name": "Jabon antibac rexona", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Jabon protex 110gr", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Jugo natulac 330ml", "baseUnit": "Unidad", "subCategory": "Bebida", "category": "Cafetin" },
  { "name": "Kit kat chocolate", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Locion valmy", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Mani jacks", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Mentitas ambrosolis", "baseUnit": "Unidad", "subCategory": "Caramelos", "category": "Cafetin" },
  { "name": "Mentos caramelos", "baseUnit": "Unidad", "subCategory": "Caramelos", "category": "Cafetin" },
  { "name": "Mentos frutas", "baseUnit": "Unidad", "subCategory": "Caramelos", "category": "Cafetin" },
  { "name": "Nucita chocolate", "baseUnit": "Unidad", "subCategory": "Tubo", "category": "Cafetin" },
  { "name": "Oreo 32g", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Palitos de chocolate", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Panque once oncee", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Papas rufles", "baseUnit": "Unidad", "subCategory": "Snack", "category": "Cafetin" },
  { "name": "Pasta dental oralb sensity", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Pepito", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Pirulin paquete", "baseUnit": "Unidad", "subCategory": "Paq pequeno", "category": "Cafetin" },
  { "name": "Prestigio", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Prestobarba gillette 3 h", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Prestobarba schick", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Prestobarba venuz", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Pringles papas", "baseUnit": "Unidad", "subCategory": "Pote peq", "category": "Cafetin" },
  { "name": "Protector diarios kotex", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Protector diarios ultraflex", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Protectores diarios 20 unidades", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Raquety", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Rikiti 30g", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Salvavidas caramelo", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Samba cho fre", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Santal active 500ml", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Savoy 30g delight", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Savoy 100g delight", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Savoy 30g", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Savoy 70g chocolate", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Shampu pantene colageno 300ml", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Susy galleta", "baseUnit": "Unidad", "subCategory": "Barra", "category": "Cafetin" },
  { "name": "Te de durazno natulac 330ml", "baseUnit": "Unidad", "subCategory": "Bebida", "category": "Cafetin" },
  { "name": "Te parmalat 500ml", "baseUnit": "Unidad", "subCategory": "Bebida", "category": "Cafetin" },
  { "name": "Toallas always diurnas", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Toallas kotex alas", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Toallas sanitarias kotex paq blanco", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Toallas sanitaris always noche", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Toallitas humedas chicco", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Toallitas humedas mimlot 72uni", "baseUnit": "Unidad", "subCategory": "Higuiene", "category": "Cafetin" },
  { "name": "Tom tostones", "baseUnit": "Unidad", "subCategory": "Bolsitas", "category": "Cafetin" },
  { "name": "Torontos", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Tostones natuchips", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Twinkys", "baseUnit": "Unidad", "subCategory": "Paquete", "category": "Cafetin" },
  { "name": "Vita c caramelo", "baseUnit": "Unidad", "subCategory": "Caramelos", "category": "Cafetin" },
  { "name": "Yesqueros bic maxi", "baseUnit": "Unidad", "subCategory": "", "category": "Cafetin" }
];

export default function SeedPage() {
  const clearAllMutation = useMutation(api.seed.clearAll);
  const bulkImportCafetin = useMutation(api.products.bulkImportCafetin);
  const updateConsumidoToUso = useMutation(api.movements.updateConsumidoToUso);
  const setAllCafetinStockToOne = useMutation(api.inventory.setAllCafetinStockToOne);
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [settingStock, setSettingStock] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'clear' | 'import' | 'update' | 'setStock' | null>(null);

  const handleClearAll = () => {
    setConfirmAction('clear');
  };

  const handleImportCafetin = () => {
    setConfirmAction('import');
  };

  const handleUpdateConsumidoToUso = () => {
    setConfirmAction('update');
  };

  const handleSetAllCafetinStockToOne = () => {
    setConfirmAction('setStock');
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setMessage(null);
    setError(null);

    try {
      if (confirmAction === 'clear') {
        setLoading(true);
        const result = await clearAllMutation();
        setMessage(`✅ ${result.message}. Eliminados: ${result.deleted.products} productos, ${result.deleted.inventory} inventarios, ${result.deleted.movements} movimientos, ${result.deleted.orders} pedidos, ${result.deleted.orderItems} orderItems.`);
        setLoading(false);
      } else if (confirmAction === 'import') {
        setImporting(true);
        const result = await bulkImportCafetin({ products: CAFETIN_PRODUCTS });
        setMessage(
          `✅ Importación completada:\n` +
          `- Creados: ${result.created}\n` +
          `- Omitidos (duplicados): ${result.skipped}\n` +
          `- Errores: ${result.errors.length}\n` +
          (result.errors.length > 0 
            ? `\nErrores:\n${result.errors.map(e => `  • ${e.name}: ${e.error}`).join('\n')}`
            : '')
        );
        setImporting(false);
      } else if (confirmAction === 'update') {
        setUpdating(true);
        const result = await updateConsumidoToUso();
        setMessage(
          `✅ Actualización completada:\n` +
          `- Movimientos actualizados: ${result.updated}\n` +
          `- Total encontrados: ${result.total}`
        );
        setUpdating(false);
      } else if (confirmAction === 'setStock') {
        setSettingStock(true);
        const result = await setAllCafetinStockToOne({ user: 'admin' });
        setMessage(
          `✅ Actualización completada:\n` +
          `- Productos actualizados: ${result.updated}\n` +
          `- Total productos en cafetín: ${result.total}`
        );
        setSettingStock(false);
      }
      setConfirmAction(null);
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
      if (confirmAction === 'clear') setLoading(false);
      if (confirmAction === 'import') setImporting(false);
      if (confirmAction === 'update') setUpdating(false);
      if (confirmAction === 'setStock') setSettingStock(false);
    }
  };

  const getConfirmModalProps = () => {
    switch (confirmAction) {
      case 'clear':
        return {
          title: 'Limpiar Base de Datos',
          message: '¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.',
          confirmText: 'Eliminar Todo',
          variant: 'destructive' as const,
          isLoading: loading,
        };
      case 'import':
        return {
          title: 'Importar Productos CAFETIN',
          message: `¿Importar ${CAFETIN_PRODUCTS.length} productos de CAFETIN?`,
          confirmText: 'Importar',
          variant: 'default' as const,
          isLoading: importing,
        };
      case 'update':
        return {
          title: 'Actualizar Movimientos',
          message: '¿Actualizar todos los movimientos de "CONSUMIDO" a "USO"?',
          confirmText: 'Actualizar',
          variant: 'default' as const,
          isLoading: updating,
        };
      case 'setStock':
        return {
          title: 'Establecer Stock',
          message: '¿Establecer stock a 1 para todos los productos en ubicación CAFETIN?',
          confirmText: 'Establecer',
          variant: 'default' as const,
          isLoading: settingStock,
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Administración de Base de Datos</h1>
          <p className="text-sm text-gray-500">
            Utiliza esta página para gestionar la base de datos.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 whitespace-pre-line">
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-emerald-600 mb-2 text-center">
                📦 Importar Productos CAFETIN
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Importa {CAFETIN_PRODUCTS.length} productos del cafetín. Los productos duplicados serán omitidos.
              </p>
              <Button
                onClick={handleImportCafetin}
                disabled={importing}
                variant="primary"
              >
                {importing ? 'Importando...' : `Importar ${CAFETIN_PRODUCTS.length} Productos`}
              </Button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-blue-600 mb-2 text-center">
                🔄 Actualizar Movimientos: CONSUMIDO → USO
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Actualiza todos los movimientos existentes que tienen "CONSUMIDO" como destino y los cambia a "USO".
              </p>
              <Button
                onClick={handleUpdateConsumidoToUso}
                disabled={updating}
                variant="primary"
              >
                {updating ? 'Actualizando...' : 'Actualizar Movimientos'}
              </Button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-purple-600 mb-2 text-center">
                📊 Establecer Stock Cafetín a 1
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Establece el stock a 1 para todos los productos en la ubicación CAFETIN. Se crearán registros de movimiento para cada ajuste.
              </p>
              <Button
                onClick={handleSetAllCafetinStockToOne}
                disabled={settingStock}
                variant="primary"
              >
                {settingStock ? 'Actualizando...' : 'Establecer Stock a 1'}
              </Button>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-red-600 mb-2 text-center">
                ⚠️ Limpiar Base de Datos
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Elimina todos los datos (items, pedidos, orderItems). Úsalo solo si necesitas empezar de cero.
              </p>
              <Button
                onClick={handleClearAll}
                disabled={loading}
                variant="secondary"
                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
              >
                {loading ? 'Eliminando...' : 'Limpiar Todo'}
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Confirmation Modal */}
      {confirmAction && getConfirmModalProps() && (
        <ConfirmationModal
          isOpen={confirmAction !== null}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          {...getConfirmModalProps()!}
        />
      )}
    </div>
  );
}
