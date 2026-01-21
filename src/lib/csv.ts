/**
 * CSV utilities for importing and exporting items
 */

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
 * Parses a CSV file and returns array of rows
 * Handles quoted fields, commas, and newlines properly
 */
export async function parseCSVFile(file: File): Promise<CSVRow[]> {
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
  const rows: CSVRow[] = [];
  const headerFields = parseCSVLine(lines[0]);
  const headerRow = headerFields.map(f => f.trim());
  
  // Find header indices
  const headerMap: Record<string, number> = {};
  headerRow.forEach((header, index) => {
    headerMap[header.toLowerCase()] = index;
  });
  
  // Check if first line is header (contains 'nombre')
  const hasHeader = headerMap['nombre'] !== undefined;
  const dataStartIndex = hasHeader ? 1 : 0;
  
  // Parse data rows
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    const fields = parseCSVLine(line);
    
    if (hasHeader) {
      // Map fields by header
      const row: Partial<CSVRow> = {};
      
      Object.keys(headerMap).forEach((header) => {
        const index = headerMap[header];
        if (index < fields.length) {
          const value = fields[index].trim();
          if (value) {
            switch (header) {
              case 'nombre':
                row.nombre = value;
                break;
              case 'categoria':
                row.categoria = value;
                break;
              case 'subcategoria':
                row.subcategoria = value;
                break;
              case 'marca':
                row.marca = value;
                break;
              case 'unidad':
                row.unidad = value;
                break;
              case 'stock_actual':
                row.stock_actual = parseFloat(value) || 0;
                break;
              case 'stock_minimo':
                row.stock_minimo = parseFloat(value) || 0;
                break;
              case 'package_size':
                row.package_size = value;
                break;
              case 'location':
                row.location = value;
                break;
              case 'extra_notes':
                row.extra_notes = value;
                break;
              case 'active':
                row.active = value.toLowerCase() === 'true' || value === '1';
                break;
              case 'updatedby':
                row.updatedBy = value;
                break;
              case 'updatedat':
                const timestamp = parseFloat(value);
                row.updatedAt = isNaN(timestamp) ? undefined : timestamp;
                break;
            }
          }
        }
      });
      
      if (row.nombre && row.categoria && row.unidad && row.location) {
        rows.push({
          nombre: row.nombre,
          categoria: row.categoria,
          subcategoria: row.subcategoria,
          marca: row.marca,
          unidad: row.unidad,
          stock_actual: row.stock_actual ?? 0,
          stock_minimo: row.stock_minimo ?? 0,
          package_size: row.package_size,
          location: row.location,
          extra_notes: row.extra_notes,
          active: row.active ?? true,
          updatedBy: row.updatedBy,
          updatedAt: row.updatedAt,
        });
      }
    } else {
      // No header, assume order: nombre, categoria, subcategoria, marca, unidad, stock_actual, stock_minimo, package_size, location, extra_notes, active, updatedBy, updatedAt
      if (fields.length >= 4) {
        rows.push({
          nombre: fields[0].trim(),
          categoria: fields[1].trim(),
          subcategoria: fields[2]?.trim() || undefined,
          marca: fields[3]?.trim() || undefined,
          unidad: fields[4]?.trim() || '',
          stock_actual: parseFloat(fields[5]?.trim() || '0') || 0,
          stock_minimo: parseFloat(fields[6]?.trim() || '0') || 0,
          package_size: fields[7]?.trim() || undefined,
          location: fields[8]?.trim() || '',
          extra_notes: fields[9]?.trim() || undefined,
          active: fields[10]?.trim().toLowerCase() === 'true' || fields[10]?.trim() === '1' || true,
          updatedBy: fields[11]?.trim() || undefined,
          updatedAt: fields[12]?.trim() ? parseFloat(fields[12].trim()) : undefined,
        });
      }
    }
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
 * Validates a CSV row
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
