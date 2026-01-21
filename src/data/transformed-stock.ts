import { Item } from '@/types';

// Helper function to calculate stock_minimo based on product type
const calculateStockMinimo = (
  stockActual: number,
  categoria: string,
  subcategoria?: string
): number => {
  // Perecederos (refrigerados, lácteos): 20-30% del stock_actual
  if (categoria === 'Refrigerados' || categoria === 'Lácteos') {
    return Math.ceil(stockActual * 0.25);
  }
  
  // Limpieza: 25-35% del stock_actual
  if (categoria === 'Limpieza') {
    return Math.ceil(stockActual * 0.30);
  }
  
  // Bebidas: 30-40% del stock_actual
  if (categoria === 'Bebidas') {
    return Math.ceil(stockActual * 0.35);
  }
  
  // No perecederos (cereales, enlatados, cocina): 30-40% del stock_actual
  return Math.ceil(stockActual * 0.35);
};

// Helper function to calculate status
const calculateStatus = (stockActual: number, stockMinimo: number): 'ok' | 'bajo_stock' => {
  return stockActual <= stockMinimo ? 'bajo_stock' : 'ok';
};

// Helper function to parse quantity from complex strings
const parseQuantity = (quantityStr: string): { cantidad: number; extraNotes?: string } => {
  const str = quantityStr.trim();
  
  // Handle "9 + 1 caja" format
  if (str.includes('+')) {
    const parts = str.split('+').map(p => p.trim());
    const mainQty = parseInt(parts[0], 10) || 0;
    const extra = parts[1] || '';
    return {
      cantidad: mainQty,
      extraNotes: extra ? extra : undefined,
    };
  }
  
  // Handle "½" format
  if (str === '½') {
    return { cantidad: 0.5 };
  }
  
  // Extract number from string
  const match = str.match(/\d+/);
  if (match) {
    return { cantidad: parseInt(match[0], 10) };
  }
  
  return { cantidad: 0 };
};

// Helper function to extract package_size from observaciones
const extractPackageSize = (observaciones: string): string | undefined => {
  if (!observaciones || observaciones === '—' || observaciones.trim() === '') {
    return undefined;
  }
  
  // Look for patterns like "cajas de 12", "paquete 4u"
  const cajasMatch = observaciones.match(/cajas?\s+de\s+(\d+)/i);
  if (cajasMatch) {
    return cajasMatch[1];
  }
  
  const paqueteMatch = observaciones.match(/paquete\s+(\d+u?)/i);
  if (paqueteMatch) {
    return paqueteMatch[1];
  }
  
  return undefined;
};

// Helper function to normalize unidad
const normalizeUnidad = (unidad: string): string => {
  const normalized = unidad.trim().toLowerCase();
  
  if (normalized.includes('lt') || normalized === 'l') {
    return 'lt';
  }
  if (normalized.includes('kg')) {
    return 'kg';
  }
  if (normalized.includes('paquete')) {
    return 'paquete';
  }
  if (normalized.includes('unidad')) {
    return 'unidad';
  }
  if (normalized.includes('bolsa')) {
    return 'bolsa';
  }
  if (normalized.includes('botella')) {
    return 'botella';
  }
  if (normalized.includes('lata')) {
    return 'lata';
  }
  if (normalized.includes('caja')) {
    return 'caja';
  }
  if (normalized.includes('atado')) {
    return 'atado';
  }
  if (normalized.includes('spray')) {
    return 'spray';
  }
  if (normalized.includes('balde')) {
    return 'balde';
  }
  
  return unidad.trim();
};

// Transform the messy data into professional format
export const transformedStockData: Omit<Item, 'status'>[] = [
  // Lácteos
  {
    id: '1',
    nombre: 'Leche UHT',
    categoria: 'Lácteos',
    subcategoria: 'Lácteos',
    marca: 'Genérica',
    unidad: 'lt',
    stock_actual: 141,
    stock_minimo: calculateStockMinimo(141, 'Lácteos'),
    package_size: '12',
    location: 'Almacén Principal',
    extra_notes: 'cajas de 12',
  },
  
  // Limpieza - Higiene
  {
    id: '2',
    nombre: 'Papel higiénico',
    categoria: 'Limpieza',
    subcategoria: 'Higiene',
    marca: 'Tessa/Bamboo',
    unidad: 'paquete',
    stock_actual: 102,
    stock_minimo: calculateStockMinimo(102, 'Limpieza', 'Higiene'),
    package_size: '4u',
    location: 'Almacén Principal',
    extra_notes: 'cajas de 12',
  },
  {
    id: '3',
    nombre: 'Servilleta',
    categoria: 'Limpieza',
    subcategoria: 'Higiene',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 58,
    stock_minimo: calculateStockMinimo(58, 'Limpieza', 'Higiene'),
    location: 'Almacén Principal',
  },
  {
    id: '4',
    nombre: 'Toalla papel',
    categoria: 'Limpieza',
    subcategoria: 'Higiene',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 66,
    stock_minimo: calculateStockMinimo(66, 'Limpieza', 'Higiene'),
    location: 'Almacén Principal',
  },
  
  // Cereales
  {
    id: '5',
    nombre: 'Cereal Azucaradas',
    categoria: 'Cereales',
    subcategoria: 'Azucaradas',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 9,
    stock_minimo: calculateStockMinimo(9, 'Cereales', 'Azucaradas'),
    location: 'Almacén Principal',
    extra_notes: '1 caja adicional',
  },
  {
    id: '6',
    nombre: 'Cereal Fruty aros',
    categoria: 'Cereales',
    subcategoria: 'Fruty aros',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 6,
    stock_minimo: calculateStockMinimo(6, 'Cereales', 'Fruty aros'),
    location: 'Almacén Principal',
    extra_notes: '1 caja adicional',
  },
  {
    id: '7',
    nombre: 'Cereal Crunch flakes',
    categoria: 'Cereales',
    subcategoria: 'Crunch flakes',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 16,
    stock_minimo: calculateStockMinimo(16, 'Cereales', 'Crunch flakes'),
    location: 'Almacén Principal',
    extra_notes: '2 cajas adicionales',
  },
  {
    id: '8',
    nombre: 'Cereal Choco flakes',
    categoria: 'Cereales',
    subcategoria: 'Choco flakes',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 3,
    stock_minimo: calculateStockMinimo(3, 'Cereales', 'Choco flakes'),
    location: 'Almacén Principal',
  },
  
  // Varios
  {
    id: '9',
    nombre: 'Bolsas comida',
    categoria: 'Cocina',
    subcategoria: 'Envases',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 43,
    stock_minimo: calculateStockMinimo(43, 'Cocina', 'Envases'),
    location: 'Almacén Principal',
  },
  
  // Bebidas
  {
    id: '10',
    nombre: 'Jugo Saltal',
    categoria: 'Bebidas',
    subcategoria: 'Jugos',
    marca: 'Genérica',
    unidad: 'botella',
    stock_actual: 37,
    stock_minimo: calculateStockMinimo(37, 'Bebidas', 'Jugos'),
    location: 'Almacén Principal',
  },
  {
    id: '11',
    nombre: 'Té Parmalat',
    categoria: 'Bebidas',
    subcategoria: 'Té',
    marca: 'Parmalat',
    unidad: 'botella',
    stock_actual: 48,
    stock_minimo: calculateStockMinimo(48, 'Bebidas', 'Té'),
    location: 'Almacén Principal',
  },
  
  // Cocina - Harinas y levaduras
  {
    id: '12',
    nombre: 'Harina todo uso',
    categoria: 'Cocina',
    subcategoria: 'Harinas',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 7,
    stock_minimo: calculateStockMinimo(7, 'Cocina', 'Harinas'),
    location: 'Almacén Principal',
  },
  {
    id: '13',
    nombre: 'Levadura',
    categoria: 'Cocina',
    subcategoria: 'Harinas',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Cocina', 'Harinas'),
    location: 'Almacén Principal',
  },
  
  // Cocina - Enlatados
  {
    id: '14',
    nombre: 'Atún',
    categoria: 'Cocina',
    subcategoria: 'Enlatados',
    marca: 'Genérica',
    unidad: 'lata',
    stock_actual: 121,
    stock_minimo: calculateStockMinimo(121, 'Cocina', 'Enlatados'),
    location: 'Almacén Principal',
  },
  {
    id: '15',
    nombre: 'Vinagre',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'botella',
    stock_actual: 13,
    stock_minimo: calculateStockMinimo(13, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
  },
  {
    id: '16',
    nombre: 'Vasos',
    categoria: 'Cocina',
    subcategoria: 'Utensilios',
    marca: 'Genérica',
    unidad: 'atado',
    stock_actual: 40,
    stock_minimo: calculateStockMinimo(40, 'Cocina', 'Utensilios'),
    location: 'Almacén Principal',
    extra_notes: '1 caja adicional',
  },
  {
    id: '17',
    nombre: 'Maíz dulce',
    categoria: 'Cocina',
    subcategoria: 'Enlatados',
    marca: 'Genérica',
    unidad: 'lata',
    stock_actual: 31,
    stock_minimo: calculateStockMinimo(31, 'Cocina', 'Enlatados'),
    location: 'Almacén Principal',
    extra_notes: '340 g',
  },
  
  // Cocina - Salsas y pastas de tomate
  {
    id: '18',
    nombre: 'Salsa tomate Pampero',
    categoria: 'Cocina',
    subcategoria: 'Salsas',
    marca: 'Pampero',
    unidad: 'balde',
    stock_actual: 3,
    stock_minimo: calculateStockMinimo(3, 'Cocina', 'Salsas'),
    location: 'Almacén Principal',
    extra_notes: '4,2kg',
  },
  {
    id: '19',
    nombre: 'Pasta tomate',
    categoria: 'Cocina',
    subcategoria: 'Salsas',
    marca: 'Pafia',
    unidad: 'balde',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Cocina', 'Salsas'),
    location: 'Almacén Principal',
    extra_notes: '2,7kg',
    sharedAreas: ['Cocina'],
  },
  {
    id: '20',
    nombre: 'Pasta tomate',
    categoria: 'Cocina',
    subcategoria: 'Salsas',
    marca: 'Coma',
    unidad: 'balde',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Cocina', 'Salsas'),
    location: 'Almacén Principal',
    extra_notes: '4kg',
    sharedAreas: ['Cocina'],
  },
  {
    id: '21',
    nombre: 'Tomate pelado Kaldini',
    categoria: 'Cocina',
    subcategoria: 'Enlatados',
    marca: 'Kaldini',
    unidad: 'balde',
    stock_actual: 7,
    stock_minimo: calculateStockMinimo(7, 'Cocina', 'Enlatados'),
    location: 'Almacén Principal',
    extra_notes: '2,5kg',
  },
  
  // Cocina - Lácteos para cocina
  {
    id: '22',
    nombre: 'Crema leche',
    categoria: 'Cocina',
    subcategoria: 'Lácteos',
    marca: 'Natulac',
    unidad: 'unidad',
    stock_actual: 11,
    stock_minimo: calculateStockMinimo(11, 'Cocina', 'Lácteos'),
    location: 'Almacén Principal',
  },
  {
    id: '23',
    nombre: 'Crema cocina',
    categoria: 'Cocina',
    subcategoria: 'Lácteos',
    marca: 'Lantique',
    unidad: 'unidad',
    stock_actual: 2,
    stock_minimo: calculateStockMinimo(2, 'Cocina', 'Lácteos'),
    location: 'Almacén Principal',
  },
  
  // Cocina - Varios
  {
    id: '24',
    nombre: 'Papelón',
    categoria: 'Cocina',
    subcategoria: 'Endulzantes',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Cocina', 'Endulzantes'),
    location: 'Almacén Principal',
    extra_notes: '500 g',
  },
  {
    id: '25',
    nombre: 'Gisante',
    categoria: 'Cocina',
    subcategoria: 'Enlatados',
    marca: 'Pafia',
    unidad: 'unidad',
    stock_actual: 14,
    stock_minimo: calculateStockMinimo(14, 'Cocina', 'Enlatados'),
    location: 'Almacén Principal',
  },
  {
    id: '26',
    nombre: 'Champiñones',
    categoria: 'Cocina',
    subcategoria: 'Enlatados',
    marca: 'Aref',
    unidad: 'lata',
    stock_actual: 4,
    stock_minimo: calculateStockMinimo(4, 'Cocina', 'Enlatados'),
    location: 'Almacén Principal',
    extra_notes: '5kg',
  },
  {
    id: '27',
    nombre: 'Arroz tradicional + esmeralda',
    categoria: 'Cocina',
    subcategoria: 'Granos',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 26,
    stock_minimo: calculateStockMinimo(26, 'Cocina', 'Granos'),
    location: 'Almacén Principal',
  },
  {
    id: '28',
    nombre: 'Arroz premium',
    categoria: 'Cocina',
    subcategoria: 'Granos',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 30,
    stock_minimo: calculateStockMinimo(30, 'Cocina', 'Granos'),
    location: 'Almacén Principal',
  },
  {
    id: '29',
    nombre: 'Sal',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 43,
    stock_minimo: calculateStockMinimo(43, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: 'aprox',
  },
  {
    id: '30',
    nombre: 'Fideo',
    categoria: 'Cocina',
    subcategoria: 'Pastas',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 61,
    stock_minimo: calculateStockMinimo(61, 'Cocina', 'Pastas'),
    location: 'Almacén Principal',
    extra_notes: '½ kg, aprox',
  },
  
  // Cocina - Salsas y condimentos
  {
    id: '31',
    nombre: 'Salsa ajo',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'lt',
    stock_actual: 4,
    stock_minimo: calculateStockMinimo(4, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: '4lt',
  },
  {
    id: '32',
    nombre: 'Salsa inglesa',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'lt',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: '3,75 lt',
  },
  {
    id: '33',
    nombre: 'Mostaza',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'lt',
    stock_actual: 3,
    stock_minimo: calculateStockMinimo(3, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: '4lt',
  },
  {
    id: '34',
    nombre: 'Caldo pollo',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 0.5,
    stock_minimo: calculateStockMinimo(0.5, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: '3,3 kg',
  },
  
  // Cocina - Pan y azúcar
  {
    id: '35',
    nombre: 'PAN',
    categoria: 'Cocina',
    subcategoria: 'Panadería',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 34,
    stock_minimo: calculateStockMinimo(34, 'Cocina', 'Panadería'),
    location: 'Almacén Principal',
    extra_notes: '4 cajas adicionales',
  },
  {
    id: '36',
    nombre: 'Azúcar',
    categoria: 'Cocina',
    subcategoria: 'Endulzantes',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 6,
    stock_minimo: calculateStockMinimo(6, 'Cocina', 'Endulzantes'),
    location: 'Almacén Principal',
    sharedAreas: ['Cocina', 'Cafetín'],
  },
  {
    id: '37',
    nombre: 'Mavesa',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Mavesa',
    unidad: 'unidad',
    stock_actual: 2,
    stock_minimo: calculateStockMinimo(2, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: '500g',
  },
  
  // Cocina - Aceites
  {
    id: '38',
    nombre: 'Aceite vegetal',
    categoria: 'Cocina',
    subcategoria: 'Aceites',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 25,
    stock_minimo: calculateStockMinimo(25, 'Cocina', 'Aceites'),
    location: 'Almacén Principal',
    extra_notes: '× 1 kg',
  },
  {
    id: '39',
    nombre: 'Aceite oliva',
    categoria: 'Cocina',
    subcategoria: 'Aceites',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 16,
    stock_minimo: calculateStockMinimo(16, 'Cocina', 'Aceites'),
    location: 'Almacén Principal',
    extra_notes: '× 500 g',
  },
  
  // Cocina - Pastas
  {
    id: '40',
    nombre: 'Fideo plumas',
    categoria: 'Cocina',
    subcategoria: 'Pastas',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 21,
    stock_minimo: calculateStockMinimo(21, 'Cocina', 'Pastas'),
    location: 'Almacén Principal',
    extra_notes: '× 1 kg',
  },
  {
    id: '41',
    nombre: 'Fideo capri',
    categoria: 'Cocina',
    subcategoria: 'Pastas',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Cocina', 'Pastas'),
    location: 'Almacén Principal',
    extra_notes: '× 1 kg',
  },
  
  // Cocina - Varios
  {
    id: '42',
    nombre: 'Cremor',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 8,
    stock_minimo: calculateStockMinimo(8, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: '395 g',
  },
  
  // Cocina - Legumbres
  {
    id: '43',
    nombre: 'Caraota negra',
    categoria: 'Cocina',
    subcategoria: 'Legumbres',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 8,
    stock_minimo: calculateStockMinimo(8, 'Cocina', 'Legumbres'),
    location: 'Almacén Principal',
    extra_notes: '× 400 g',
  },
  {
    id: '44',
    nombre: 'Caraota roja',
    categoria: 'Cocina',
    subcategoria: 'Legumbres',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 16,
    stock_minimo: calculateStockMinimo(16, 'Cocina', 'Legumbres'),
    location: 'Almacén Principal',
    extra_notes: '× 400 g',
  },
  {
    id: '45',
    nombre: 'Lenteja',
    categoria: 'Cocina',
    subcategoria: 'Legumbres',
    marca: 'Genérica',
    unidad: 'bolsa',
    stock_actual: 23,
    stock_minimo: calculateStockMinimo(23, 'Cocina', 'Legumbres'),
    location: 'Almacén Principal',
    extra_notes: '× 400 g',
  },
  
  // Bebidas - Té
  {
    id: '46',
    nombre: 'Té negro',
    categoria: 'Bebidas',
    subcategoria: 'Té',
    marca: 'Genérica',
    unidad: 'caja',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Bebidas', 'Té'),
    location: 'Almacén Principal',
  },
  
  // Cocina - Condimentos especiales
  {
    id: '47',
    nombre: 'Adobo y super aliño',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
    extra_notes: 'doble ítem: 5 / 5',
  },
  {
    id: '48',
    nombre: 'Curry',
    categoria: 'Cocina',
    subcategoria: 'Condimentos',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Cocina', 'Condimentos'),
    location: 'Almacén Principal',
  },
  {
    id: '49',
    nombre: 'Maicena',
    categoria: 'Cocina',
    subcategoria: 'Harinas',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Cocina', 'Harinas'),
    location: 'Almacén Principal',
    extra_notes: '800 g',
  },
  {
    id: '50',
    nombre: 'Sirope chocolate',
    categoria: 'Cocina',
    subcategoria: 'Endulzantes',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Cocina', 'Endulzantes'),
    location: 'Almacén Principal',
    extra_notes: '250 ml',
  },
  
  // Limpieza
  {
    id: '51',
    nombre: 'Bolsas blancas / negras / aluminio / limp',
    categoria: 'Limpieza',
    subcategoria: 'Limpieza general',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 0, // No se especificó cantidad
    stock_minimo: calculateStockMinimo(10, 'Limpieza', 'Limpieza general'), // Asumir mínimo
    location: 'Almacén Principal',
  },
  {
    id: '52',
    nombre: 'Vale',
    categoria: 'Limpieza',
    subcategoria: 'Limpieza general',
    marca: 'Genérica',
    unidad: 'spray',
    stock_actual: 11,
    stock_minimo: calculateStockMinimo(11, 'Limpieza', 'Limpieza general'),
    location: 'Almacén Principal',
  },
  {
    id: '53',
    nombre: 'Pride muebles',
    categoria: 'Limpieza',
    subcategoria: 'Limpieza general',
    marca: 'Pride',
    unidad: 'spray',
    stock_actual: 15,
    stock_minimo: calculateStockMinimo(15, 'Limpieza', 'Limpieza general'),
    location: 'Almacén Principal',
  },
  {
    id: '54',
    nombre: 'Cepillo escoba',
    categoria: 'Limpieza',
    subcategoria: 'Limpieza general',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Limpieza', 'Limpieza general'),
    location: 'Almacén Principal',
  },
  {
    id: '55',
    nombre: 'Bicarbonato',
    categoria: 'Limpieza',
    subcategoria: 'Limpieza general',
    marca: 'Genérica',
    unidad: 'kg',
    stock_actual: 9,
    stock_minimo: calculateStockMinimo(9, 'Limpieza', 'Limpieza general'),
    location: 'Almacén Principal',
  },
  
  // Refrigerados
  {
    id: '56',
    nombre: 'Mantequilla',
    categoria: 'Refrigerados',
    subcategoria: 'Lácteos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 17,
    stock_minimo: calculateStockMinimo(17, 'Refrigerados', 'Lácteos'),
    location: 'Almacén Principal',
    extra_notes: '× 200 g',
  },
  {
    id: '57',
    nombre: 'Jamón cocido',
    categoria: 'Refrigerados',
    subcategoria: 'Embutidos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 3,
    stock_minimo: calculateStockMinimo(3, 'Refrigerados', 'Embutidos'),
    location: 'Almacén Principal',
  },
  {
    id: '58',
    nombre: 'Pechuga cocida',
    categoria: 'Refrigerados',
    subcategoria: 'Embutidos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 7,
    stock_minimo: calculateStockMinimo(7, 'Refrigerados', 'Embutidos'),
    location: 'Almacén Principal',
  },
  {
    id: '59',
    nombre: 'Queso gouda',
    categoria: 'Refrigerados',
    subcategoria: 'Quesos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 5,
    stock_minimo: calculateStockMinimo(5, 'Refrigerados', 'Quesos'),
    location: 'Almacén Principal',
  },
  {
    id: '60',
    nombre: 'Queso crema',
    categoria: 'Refrigerados',
    subcategoria: 'Quesos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 20,
    stock_minimo: calculateStockMinimo(20, 'Refrigerados', 'Quesos'),
    location: 'Almacén Principal',
  },
  {
    id: '61',
    nombre: 'Mozzarella',
    categoria: 'Refrigerados',
    subcategoria: 'Quesos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 7,
    stock_minimo: calculateStockMinimo(7, 'Refrigerados', 'Quesos'),
    location: 'Almacén Principal',
  },
  {
    id: '62',
    nombre: 'Pecorino',
    categoria: 'Refrigerados',
    subcategoria: 'Quesos',
    marca: 'Genérica',
    unidad: 'unidad',
    stock_actual: 1,
    stock_minimo: calculateStockMinimo(1, 'Refrigerados', 'Quesos'),
    location: 'Almacén Principal',
  },
];

// Add status to each item
export const seedItems: Item[] = transformedStockData.map((item) => ({
  ...item,
  status: calculateStatus(item.stock_actual, item.stock_minimo),
}));
