/**
 * Script para cargar datos iniciales en Convex
 * 
 * Uso:
 * 1. Asegúrate de que Convex esté corriendo: npm run convex:dev
 * 2. Ejecuta este script: npx tsx scripts/seed-convex.ts
 * 
 * O desde el dashboard de Convex:
 * - Ejecuta la mutation "seed:seedItems" con los datos del array seedItems
 */

import { seedItems } from '../src/data/transformed-stock';

// Transformar los datos de Item a el formato que espera la mutation
const transformItemsForConvex = (items: typeof seedItems) => {
  return items.map(item => ({
    nombre: item.nombre,
    categoria: item.categoria,
    subcategoria: item.subcategoria,
    marca: item.marca,
    unidad: item.unidad,
    stock_actual: item.stock_actual,
    stock_minimo: item.stock_minimo,
    package_size: item.package_size,
    location: item.location,
    extra_notes: item.extra_notes,
  }));
};

// Datos transformados listos para pasar a la mutation
export const convexSeedData = transformItemsForConvex(seedItems);

console.log(`Preparados ${convexSeedData.length} items para seed`);
console.log('\nPara cargar los datos:');
console.log('1. Ve al dashboard de Convex');
console.log('2. Ejecuta la mutation: seed:seedItems');
console.log('3. Pega el siguiente JSON como argumento:\n');
console.log(JSON.stringify({ items: convexSeedData }, null, 2));
