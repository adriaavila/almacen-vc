/**
 * CSV utilities for importing and exporting items
 */

// Legacy CSV format (old schema)
export interface CSVRow {
  nombre: string;
  categoria: string;
  subcategoria?: string;
  marca?: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  package_size?: string;
  location: string;
  extra_notes?: string;
  active: boolean;
  updatedBy?: string;
  updatedAt?: number;
}

// New CSV format (new schema)
export interface CSVProductRow {
  name: string;
  brand?: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit?: string;
  conversionFactor?: number;
  active?: boolean;
  stockAlmacen?: number;
  stockCafetin?: number;
  stockMinimoAlmacen?: number;
  stockMinimoCafetin?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

type ConvexItem = {
  _id: string;
  nombre: string;
  categoria: string;
  subcategoria?: string;
  marca?: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  package_size?: string;
  location: string;
  extra_notes?: string;
  status: "ok" | "bajo_stock";
  active?: boolean;
  updatedBy?: string;
  updatedAt?: number;
};

/**
 * Escapes a CSV field value, handling quotes and commas
 */
function escapeCSVField(value: string | number | boolean | undefined | null): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts items array to CSV format
 */
export function exportItemsToCSV(items: ConvexItem[]): string {
  const headers = [
    'nombre',
    'categoria',
    'subcategoria',
    'marca',
    'unidad',
    'stock_actual',
    'stock_minimo',
    'package_size',
    'location',
    'extra_notes',
    'active',
    'updatedBy',
    'updatedAt',
  ];
  
  const headerRow = headers.join(',');
  
  const rows = items.map((item) => {
    return [
      escapeCSVField(item.nombre),
      escapeCSVField(item.categoria),
      escapeCSVField(item.subcategoria),
      escapeCSVField(item.marca),
      escapeCSVField(item.unidad),
      escapeCSVField(item.stock_actual),
      escapeCSVField(item.stock_minimo),
      escapeCSVField(item.package_size),
      escapeCSVField(item.location),
      escapeCSVField(item.extra_notes),
      escapeCSVField(item.active ?? true), // Default to true if undefined
      escapeCSVField(item.updatedBy),
      escapeCSVField(item.updatedAt),
    ].join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}

/**
 * Detects CSV format (new or legacy) based on headers
 */
function detectCSVFormat(headerMap: Record<string, number>): 'new' | 'legacy' {
  // Check for new schema fields
  if (headerMap['name'] !== undefined || headerMap['baseunit'] !== undefined || 
      headerMap['category'] !== undefined || headerMap['stockalmacen'] !== undefined) {
    return 'new';
  }
  // Check for legacy schema fields
  if (headerMap['nombre'] !== undefined || headerMap['categoria'] !== undefined || 
      headerMap['unidad'] !== undefined || headerMap['stock_actual'] !== undefined) {
    return 'legacy';
  }
  // Default to legacy for backward compatibility
  return 'legacy';
}

/**
 * Maps legacy CSV row to new schema format
 */
export function mapLegacyToNewSchema(row: CSVRow): CSVProductRow {
  // Map location to determine which inventory location to set
  const locationLower = row.location?.toLowerCase() || '';
  const isAlmacen = locationLower.includes('almacen') || locationLower === 'almacen';
  const isCafetin = locationLower.includes('cafetin') || locationLower === 'cafetin' || locationLower.includes('cafetín');

  const mapped: CSVProductRow = {
    name: row.nombre,
    brand: row.marca || '',
    category: row.categoria,
    subCategory: row.subcategoria,
    baseUnit: row.unidad,
    purchaseUnit: row.unidad, // Default to same as baseUnit
    conversionFactor: 1, // Default to 1
    active: row.active ?? true,
  };

  // Map stock based on location
  if (isAlmacen) {
    mapped.stockAlmacen = row.stock_actual ?? 0;
    mapped.stockMinimoAlmacen = row.stock_minimo ?? 0;
  } else if (isCafetin) {
    mapped.stockCafetin = row.stock_actual ?? 0;
    mapped.stockMinimoCafetin = row.stock_minimo ?? 0;
  } else {
    // Default to almacen if location unclear
    mapped.stockAlmacen = row.stock_actual ?? 0;
    mapped.stockMinimoAlmacen = row.stock_minimo ?? 0;
  }

  return mapped;
}

/**
 * Parses a CSV file and returns array of rows in new schema format
 * Handles quoted fields, commas, and newlines properly
 * Supports both new and legacy CSV formats
 * Returns both valid rows and parsing errors
 */
export interface ParseCSVResult {
  rows: CSVProductRow[];
  errors: Array<{ row: number; message: string }>;
}

export async function parseCSVFile(file: File): Promise<CSVProductRow[]>;
export async function parseCSVFile(file: File, includeErrors: true): Promise<ParseCSVResult>;
export async function parseCSVFile(file: File, includeErrors?: boolean): Promise<CSVProductRow[] | ParseCSVResult> {
  const text = await file.text();
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;
  
  // Parse CSV considering quoted fields that may contain newlines
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentLine += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
        currentLine += char;
      }
    } else if (char === '\n' || char === '\r') {
      if (insideQuotes) {
        // Newline inside quoted field
        currentLine += char === '\r' && nextChar === '\n' ? '\n' : char;
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n after \r
        }
      } else {
        // End of line
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      }
    } else {
      currentLine += char;
    }
  }
  
  // Add last line if exists
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse each line into fields
  const headerFields = parseCSVLine(lines[0]);
  const headerRow = headerFields.map(f => f.trim());
  
  // Find header indices
  const headerMap: Record<string, number> = {};
  headerRow.forEach((header, index) => {
    headerMap[header.toLowerCase()] = index;
  });
  
  // Detect format
  const format = detectCSVFormat(headerMap);
  const hasHeader = format === 'new' 
    ? (headerMap['name'] !== undefined || headerMap['nombre'] !== undefined)
    : (headerMap['nombre'] !== undefined);
  const dataStartIndex = hasHeader ? 1 : 0;
  
  const rows: CSVProductRow[] = [];
  const parsingErrors: Array<{ row: number; message: string }> = [];
  
  // Parse data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-based row number for error reporting
    const line = lines[i];
    const fields = parseCSVLine(line);
    
    if (format === 'new') {
      // Parse new schema format
      const row: Partial<CSVProductRow> = {};
      
      // Helper function to normalize empty values and "-" placeholders
      const normalizeValue = (val: string): string => {
        const trimmed = val.trim();
        return trimmed === '-' ? '' : trimmed;
      };
      
      // Helper function to check if value is empty or placeholder
      const isEmptyOrPlaceholder = (val: string): boolean => {
        const normalized = normalizeValue(val);
        return normalized === '';
      };
      
      // Process all fields
      Object.keys(headerMap).forEach((header) => {
        const index = headerMap[header];
        if (index < fields.length) {
          const rawValue = fields[index];
          const value = normalizeValue(rawValue);
          
          switch (header) {
            case 'name':
              // Required field - only set if not empty
              if (!isEmptyOrPlaceholder(rawValue)) {
                row.name = value;
              }
              break;
            case 'brand':
              // Optional field - always set (empty string if empty or "-")
              row.brand = value;
              break;
            case 'category':
              // Required field - only set if not empty
              if (!isEmptyOrPlaceholder(rawValue)) {
                row.category = value;
              }
              break;
            case 'subcategory':
              // Optional field - set to undefined if empty, otherwise use value
              row.subCategory = isEmptyOrPlaceholder(rawValue) ? undefined : value;
              break;
            case 'baseunit':
              // Required field - only set if not empty
              if (!isEmptyOrPlaceholder(rawValue)) {
                row.baseUnit = value;
              }
              break;
            case 'purchaseunit':
              // Optional field - will default to baseUnit if empty
              if (!isEmptyOrPlaceholder(rawValue)) {
                row.purchaseUnit = value;
              }
              break;
            case 'conversionfactor':
              // Numeric field - default to 1 if empty or invalid
              if (!isEmptyOrPlaceholder(rawValue)) {
                const num = parseFloat(value);
                row.conversionFactor = isNaN(num) ? 1 : num;
              }
              break;
            case 'active':
              // Boolean field - handle uppercase TRUE/FALSE and empty values
              if (isEmptyOrPlaceholder(rawValue)) {
                row.active = true; // Default to true
              } else {
                const lowerValue = value.toLowerCase();
                row.active = lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
              }
              break;
            case 'stockalmacen':
              // Optional numeric field
              if (!isEmptyOrPlaceholder(rawValue)) {
                const num = parseFloat(value);
                row.stockAlmacen = isNaN(num) ? 0 : num;
              }
              break;
            case 'stockcafetin':
              // Optional numeric field
              if (!isEmptyOrPlaceholder(rawValue)) {
                const num = parseFloat(value);
                row.stockCafetin = isNaN(num) ? 0 : num;
              }
              break;
            case 'stockminimoalmacen':
              // Optional numeric field
              if (!isEmptyOrPlaceholder(rawValue)) {
                const num = parseFloat(value);
                row.stockMinimoAlmacen = isNaN(num) ? 0 : num;
              }
              break;
            case 'stockminimocafetin':
              // Optional numeric field
              if (!isEmptyOrPlaceholder(rawValue)) {
                const num = parseFloat(value);
                row.stockMinimoCafetin = isNaN(num) ? 0 : num;
              }
              break;
          }
        }
      });
      
      // Validate required fields and add row if valid
      if (!row.name) {
        parsingErrors.push({
          row: rowNumber,
          message: `Fila ${rowNumber}: El campo 'name' es requerido pero está vacío o contiene '-'`,
        });
      } else if (!row.category) {
        parsingErrors.push({
          row: rowNumber,
          message: `Fila ${rowNumber}: El campo 'category' es requerido pero está vacío o contiene '-'`,
        });
      } else if (!row.baseUnit) {
        parsingErrors.push({
          row: rowNumber,
          message: `Fila ${rowNumber}: El campo 'baseUnit' es requerido pero está vacío o contiene '-'`,
        });
      } else {
        rows.push({
          name: row.name,
          brand: row.brand ?? '',
          category: row.category,
          subCategory: row.subCategory,
          baseUnit: row.baseUnit,
          purchaseUnit: row.purchaseUnit || row.baseUnit, // Default to baseUnit if empty
          conversionFactor: row.conversionFactor ?? 1,
          active: row.active ?? true,
          stockAlmacen: row.stockAlmacen,
          stockCafetin: row.stockCafetin,
          stockMinimoAlmacen: row.stockMinimoAlmacen,
          stockMinimoCafetin: row.stockMinimoCafetin,
        });
      }
    } else {
      // Parse legacy format and map to new schema
      const legacyRow: Partial<CSVRow> = {};
      
      Object.keys(headerMap).forEach((header) => {
        const index = headerMap[header];
        if (index < fields.length) {
          const value = fields[index].trim();
          if (value) {
            switch (header) {
              case 'nombre':
                legacyRow.nombre = value;
                break;
              case 'categoria':
                legacyRow.categoria = value;
                break;
              case 'subcategoria':
                legacyRow.subcategoria = value;
                break;
              case 'marca':
                legacyRow.marca = value;
                break;
              case 'unidad':
                legacyRow.unidad = value;
                break;
              case 'stock_actual':
                legacyRow.stock_actual = parseFloat(value) || 0;
                break;
              case 'stock_minimo':
                legacyRow.stock_minimo = parseFloat(value) || 0;
                break;
              case 'package_size':
                legacyRow.package_size = value;
                break;
              case 'location':
                legacyRow.location = value;
                break;
              case 'extra_notes':
                legacyRow.extra_notes = value;
                break;
              case 'active':
                legacyRow.active = value.toLowerCase() === 'true' || value === '1';
                break;
            }
          }
        }
      });
      
      // If no header, assume positional format
      if (!hasHeader && fields.length >= 4) {
        legacyRow.nombre = fields[0].trim();
        legacyRow.categoria = fields[1].trim();
        legacyRow.subcategoria = fields[2]?.trim() || undefined;
        legacyRow.marca = fields[3]?.trim() || undefined;
        legacyRow.unidad = fields[4]?.trim() || '';
        legacyRow.stock_actual = parseFloat(fields[5]?.trim() || '0') || 0;
        legacyRow.stock_minimo = parseFloat(fields[6]?.trim() || '0') || 0;
        legacyRow.location = fields[8]?.trim() || 'almacen';
        legacyRow.active = fields[10]?.trim().toLowerCase() === 'true' || fields[10]?.trim() === '1' || true;
      }
      
      if (legacyRow.nombre && legacyRow.categoria && legacyRow.unidad) {
        const mapped = mapLegacyToNewSchema({
          nombre: legacyRow.nombre,
          categoria: legacyRow.categoria,
          subcategoria: legacyRow.subcategoria,
          marca: legacyRow.marca,
          unidad: legacyRow.unidad,
          stock_actual: legacyRow.stock_actual ?? 0,
          stock_minimo: legacyRow.stock_minimo ?? 0,
          package_size: legacyRow.package_size,
          location: legacyRow.location || 'almacen',
          extra_notes: legacyRow.extra_notes,
          active: legacyRow.active ?? true,
        });
        rows.push(mapped);
      }
    }
  }
  
  if (includeErrors) {
    return { rows, errors: parsingErrors };
  }
  
  return rows;
}

/**
 * Parses a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of field
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add last field
  fields.push(currentField);
  
  return fields;
}

/**
 * Validates a CSV product row (new schema)
 */
export function validateCSVProductRow(row: Partial<CSVProductRow>, rowIndex: number): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!row.name || row.name.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'name' es requerido`);
  }
  
  if (!row.category || row.category.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'category' es requerido`);
  }
  
  if (!row.baseUnit || row.baseUnit.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'baseUnit' es requerido`);
  }
  
  // Numeric fields
  if (row.conversionFactor !== undefined && (isNaN(row.conversionFactor) || row.conversionFactor <= 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'conversionFactor' debe ser un número > 0`);
  }
  
  if (row.stockAlmacen !== undefined && (isNaN(row.stockAlmacen) || row.stockAlmacen < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'stockAlmacen' debe ser un número >= 0`);
  }
  
  if (row.stockCafetin !== undefined && (isNaN(row.stockCafetin) || row.stockCafetin < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'stockCafetin' debe ser un número >= 0`);
  }
  
  if (row.stockMinimoAlmacen !== undefined && (isNaN(row.stockMinimoAlmacen) || row.stockMinimoAlmacen < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'stockMinimoAlmacen' debe ser un número >= 0`);
  }
  
  if (row.stockMinimoCafetin !== undefined && (isNaN(row.stockMinimoCafetin) || row.stockMinimoCafetin < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'stockMinimoCafetin' debe ser un número >= 0`);
  }
  
  // Boolean field
  if (row.active !== undefined && typeof row.active !== 'boolean') {
    errors.push(`Fila ${rowIndex + 1}: 'active' debe ser true/false`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a CSV row (legacy schema - kept for backward compatibility)
 */
export function validateCSVRow(row: Partial<CSVRow>, rowIndex: number): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!row.nombre || row.nombre.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'nombre' es requerido`);
  }
  
  if (!row.categoria || row.categoria.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'categoria' es requerido`);
  }
  
  if (!row.unidad || row.unidad.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'unidad' es requerido`);
  }
  
  if (!row.location || row.location.trim() === '') {
    errors.push(`Fila ${rowIndex + 1}: El campo 'location' es requerido`);
  }
  
  // Numeric fields
  if (row.stock_actual !== undefined && (isNaN(row.stock_actual) || row.stock_actual < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'stock_actual' debe ser un número >= 0`);
  }
  
  if (row.stock_minimo !== undefined && (isNaN(row.stock_minimo) || row.stock_minimo < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'stock_minimo' debe ser un número >= 0`);
  }
  
  // Boolean field
  if (row.active !== undefined && typeof row.active !== 'boolean') {
    errors.push(`Fila ${rowIndex + 1}: 'active' debe ser true/false`);
  }
  
  // Optional updatedBy
  if (row.updatedBy !== undefined && typeof row.updatedBy !== 'string') {
    errors.push(`Fila ${rowIndex + 1}: 'updatedBy' debe ser una cadena de texto`);
  }
  
  // updatedAt is ignored during import (set automatically), but validate if present
  if (row.updatedAt !== undefined && (isNaN(row.updatedAt) || row.updatedAt < 0)) {
    errors.push(`Fila ${rowIndex + 1}: 'updatedAt' debe ser un número timestamp válido (será ignorado durante importación)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
