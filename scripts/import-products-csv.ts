/**
 * Script para importar productos desde un archivo CSV a Convex
 * 
 * Uso:
 * 1. Para desarrollo: npx tsx scripts/import-products-csv.ts <ruta-al-csv> [--env=dev]
 * 2. Para producción: npx tsx scripts/import-products-csv.ts <ruta-al-csv> --env=prod
 * 
 * Ejemplo:
 * npx tsx scripts/import-products-csv.ts /Users/ama/Downloads/productos.csv
 * npx tsx scripts/import-products-csv.ts /Users/ama/Downloads/productos.csv --env=prod
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { parseCSVFile } from "../src/lib/csv";
import * as fs from "fs";
import * as path from "path";

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          env[key] = value;
        }
      }
    }
  }
  return env;
}

async function importProductsFromCSV(csvPath: string, environment: 'dev' | 'prod' = 'dev') {
  // Verificar que el archivo existe
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: El archivo no existe: ${csvPath}`);
    process.exit(1);
  }

  const projectRoot = path.resolve(__dirname, "..");
  
  // Cargar variables de entorno según el entorno
  let convexUrl: string | undefined;
  
  if (environment === 'prod') {
    // Para producción, buscar en variables de entorno primero, luego archivos
    const envProd = loadEnvFile(path.join(projectRoot, ".env.production.local")) ||
                    loadEnvFile(path.join(projectRoot, ".env.production")) ||
                    loadEnvFile(path.join(projectRoot, ".env.local"));
    
    convexUrl = 
      process.env.CONVEX_URL || // Permite pasar directamente como variable de entorno
      process.env.CONVEX_URL_PROD ||
      process.env.NEXT_PUBLIC_CONVEX_URL_PROD ||
      envProd.CONVEX_URL_PROD ||
      envProd.NEXT_PUBLIC_CONVEX_URL_PROD ||
      envProd.CONVEX_URL ||
      envProd.NEXT_PUBLIC_CONVEX_URL;
  } else {
    // Para desarrollo, usar .env.local
    const envLocal = loadEnvFile(path.join(projectRoot, ".env.local"));
    
    convexUrl = 
      process.env.CONVEX_URL || 
      process.env.NEXT_PUBLIC_CONVEX_URL ||
      envLocal.CONVEX_URL ||
      envLocal.NEXT_PUBLIC_CONVEX_URL;
  }
    
  if (!convexUrl) {
    console.error(`❌ Error: CONVEX_URL no está configurada para ${environment === 'prod' ? 'producción' : 'desarrollo'}.`);
    if (environment === 'prod') {
      console.error("   Para producción, configura CONVEX_URL_PROD o NEXT_PUBLIC_CONVEX_URL_PROD");
      console.error("   en .env.production.local o .env.production");
    } else {
      console.error("   Asegúrate de tener un archivo .env.local con CONVEX_URL o NEXT_PUBLIC_CONVEX_URL");
    }
    console.error("   Puedes obtenerla desde: https://dashboard.convex.dev");
    process.exit(1);
  }

  console.log("📦 Iniciando importación de productos...");
  console.log(`   Entorno: ${environment === 'prod' ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  console.log(`   Archivo: ${csvPath}`);
  console.log(`   Convex URL: ${convexUrl}\n`);

  try {
    // Leer el archivo CSV como texto
    const csvText = fs.readFileSync(csvPath, "utf-8");
    
    // Crear un objeto File-like para parseCSVFile
    // En Node.js no existe File nativo, así que creamos un objeto compatible
    const file = {
      text: async () => csvText,
    } as File;

    // Parsear el CSV
    console.log("📖 Parseando archivo CSV...");
    const parseResult = await parseCSVFile(file, true);
    
    if (parseResult.errors.length > 0) {
      console.warn(`⚠️  Advertencias al parsear CSV:`);
      parseResult.errors.forEach((error) => {
        console.warn(`   ${error.message}`);
      });
      console.log();
    }

    const products = parseResult.rows;
    console.log(`✅ ${products.length} productos parseados correctamente\n`);

    if (products.length === 0) {
      console.error("❌ No se encontraron productos válidos en el CSV");
      process.exit(1);
    }

    // Conectar a Convex
    const client = new ConvexHttpClient(convexUrl);

    // Importar productos usando la mutación bulkImport
    // Dividir en lotes para evitar timeouts
    const BATCH_SIZE = 50;
    const batches: typeof products[] = [];
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    console.log(`🔄 Importando ${products.length} productos en ${batches.length} lotes...`);
    
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: Array<{ row: number; name: string; error: string }> = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`   Procesando lote ${batchIndex + 1}/${batches.length} (${batch.length} productos)...`);
      
      try {
        const result = await client.mutation(api.products.bulkImport, {
          products: batch.map((p) => ({
            name: p.name,
            brand: p.brand || "",
            category: p.category,
            subCategory: p.subCategory,
            baseUnit: p.baseUnit,
            purchaseUnit: p.purchaseUnit || p.baseUnit,
            conversionFactor: p.conversionFactor ?? 1,
            active: p.active ?? true,
            stockAlmacen: p.stockAlmacen,
            stockCafetin: p.stockCafetin,
            stockMinimoAlmacen: p.stockMinimoAlmacen,
            stockMinimoCafetin: p.stockMinimoCafetin,
          })),
        });

        totalCreated += result.created;
        totalUpdated += result.updated;
        totalSkipped += result.skipped;
        allErrors.push(...result.errors);
      } catch (error: any) {
        console.error(`   ❌ Error en lote ${batchIndex + 1}: ${error.message}`);
        // Continuar con el siguiente lote
        allErrors.push({
          row: batchIndex * BATCH_SIZE + 1,
          name: `Lote ${batchIndex + 1}`,
          error: error.message,
        });
      }
    }

    const result = {
      created: totalCreated,
      updated: totalUpdated,
      skipped: totalSkipped,
      errors: allErrors,
    };

    // Mostrar resultados
    console.log("\n✅ Importación completada!");
    console.log(`   ✅ Productos creados: ${result.created}`);
    console.log(`   🔄 Productos actualizados: ${result.updated}`);
    console.log(`   ⏭️  Productos omitidos (duplicados): ${result.skipped}`);
    
    if (result.errors.length > 0) {
      console.log(`   ❌ Errores: ${result.errors.length}`);
      result.errors.forEach((error) => {
        console.error(`      - Fila ${error.row}: ${error.name} - ${error.error}`);
      });
    }

    console.log("\n✨ ¡Listo! Los productos han sido importados a Convex.");
  } catch (error: any) {
    console.error("\n❌ Error durante la importación:");
    console.error(error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
const csvPath = process.argv[2];
const envArg = process.argv.find(arg => arg.startsWith('--env='));
const environment = envArg ? (envArg.split('=')[1] as 'dev' | 'prod') : 'dev';

if (!csvPath) {
  console.error("❌ Error: Debes proporcionar la ruta al archivo CSV");
  console.error("\nUso:");
  console.error("  npx tsx scripts/import-products-csv.ts <ruta-al-csv> [--env=dev|prod]");
  console.error("\nEjemplos:");
  console.error("  # Desarrollo (por defecto):");
  console.error("  npx tsx scripts/import-products-csv.ts /Users/ama/Downloads/productos.csv");
  console.error("  # Producción:");
  console.error("  npx tsx scripts/import-products-csv.ts /Users/ama/Downloads/productos.csv --env=prod");
  process.exit(1);
}

if (environment !== 'dev' && environment !== 'prod') {
  console.error("❌ Error: El entorno debe ser 'dev' o 'prod'");
  process.exit(1);
}

importProductsFromCSV(csvPath, environment);
