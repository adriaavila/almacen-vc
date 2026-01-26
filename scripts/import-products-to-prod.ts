/**
 * Script alternativo para importar productos a producción usando el CLI de Convex
 * 
 * Este script prepara los datos y los importa usando `convex run` en lugar de HTTP client
 * 
 * Uso:
 * 1. Asegúrate de tener las funciones desplegadas: npm run convex:deploy
 * 2. Ejecuta: npx tsx scripts/import-products-to-prod.ts <ruta-al-csv>
 */

import { parseCSVFile } from "../src/lib/csv";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

async function importProductsToProd(csvPath: string) {
  // Verificar que el archivo existe
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Error: El archivo no existe: ${csvPath}`);
    process.exit(1);
  }

  console.log("📦 Preparando importación de productos a PRODUCCIÓN...");
  console.log(`   Archivo: ${csvPath}\n`);

  try {
    // Leer el archivo CSV como texto
    const csvText = fs.readFileSync(csvPath, "utf-8");
    
    // Crear un objeto File-like para parseCSVFile
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

    // Preparar los datos para la mutación
    const productsData = products.map((p) => ({
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
    }));

    // Guardar temporalmente en un archivo JSON
    const tempJsonPath = path.join(__dirname, "temp-products-import.json");
    fs.writeFileSync(tempJsonPath, JSON.stringify({ products: productsData }, null, 2));

    console.log("🔄 Importando productos usando Convex CLI...");
    console.log("   (Esto puede tardar unos minutos...)\n");

    try {
      // Usar convex run para ejecutar la mutación en producción
      // Primero necesitamos cambiar al deployment de producción
      const command = `npx convex run products:bulkImport --prod --args '${JSON.stringify({ products: productsData })}'`;
      
      console.log("Ejecutando:", command.substring(0, 100) + "...");
      const output = execSync(command, { 
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf-8",
        stdio: "inherit"
      });

      console.log("\n✅ Importación completada!");
    } catch (error: any) {
      console.error("\n❌ Error durante la importación:");
      console.error(error.message);
      
      // Alternativa: usar el archivo JSON con convex import
      console.log("\n💡 Alternativa: Puedes importar manualmente usando:");
      console.log(`   npx convex run products:bulkImport --prod < ${tempJsonPath}`);
      console.log(`   O desde el dashboard de Convex ejecuta products:bulkImport con:`);
      console.log(JSON.stringify({ products: productsData }, null, 2).substring(0, 500) + "...");
      
      throw error;
    } finally {
      // Limpiar archivo temporal
      if (fs.existsSync(tempJsonPath)) {
        fs.unlinkSync(tempJsonPath);
      }
    }

    console.log("\n✨ ¡Listo! Los productos han sido importados a producción.");
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

if (!csvPath) {
  console.error("❌ Error: Debes proporcionar la ruta al archivo CSV");
  console.error("\nUso:");
  console.error("  npx tsx scripts/import-products-to-prod.ts <ruta-al-csv>");
  console.error("\nEjemplo:");
  console.error("  npx tsx scripts/import-products-to-prod.ts /Users/ama/Downloads/productos.csv");
  process.exit(1);
}

importProductsToProd(csvPath);
