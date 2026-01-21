export interface ExportData {
  orders?: any[];
  inventory?: any[];
  movements?: any[];
  consumption?: {
    Cocina?: number;
    Cafetin?: number;
    Cafetín?: number; // Display name
    Limpieza?: number;
  };
  metadata?: {
    dateRange?: string;
    exportedAt: string;
  };
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      // Handle values that might contain commas or quotes
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Export data to CSV file
 */
export function exportToCSV(data: ExportData, filename: string = 'export.csv'): void {
  const sections: string[] = [];
  
  // Add metadata if provided
  if (data.metadata) {
    sections.push('Metadata');
    sections.push(`Fecha de exportación: ${data.metadata.exportedAt}`);
    if (data.metadata.dateRange) {
      sections.push(`Período: ${data.metadata.dateRange}`);
    }
    sections.push('');
  }
  
  // Add orders section
  if (data.orders && data.orders.length > 0) {
    sections.push('Pedidos');
    sections.push(convertToCSV(data.orders));
    sections.push('');
  }
  
  // Add inventory section
  if (data.inventory && data.inventory.length > 0) {
    sections.push('Inventario');
    sections.push(convertToCSV(data.inventory));
    sections.push('');
  }
  
  // Add movements section
  if (data.movements && data.movements.length > 0) {
    sections.push('Movimientos de Stock');
    sections.push(convertToCSV(data.movements));
    sections.push('');
  }
  
  // Add consumption summary
  if (data.consumption) {
    sections.push('Consumo por Área');
    sections.push('Área,Cantidad');
    sections.push(`Cocina,${data.consumption.Cocina || 0}`);
    // Handle ASCII-safe key (Cafetin) - backend uses this, frontend maps to display name
    const cafetinValue = data.consumption.Cafetin || 0;
    sections.push(`Cafetín,${cafetinValue}`);
    sections.push(`Limpieza,${data.consumption.Limpieza || 0}`);
    sections.push('');
  }
  
  const csvContent = sections.join('\n');
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Format date range for export filename
 */
export function formatDateRangeForFilename(startDate?: number, endDate?: number): string {
  if (!startDate || !endDate) return 'all-time';
  
  const start = new Date(startDate).toISOString().split('T')[0];
  const end = new Date(endDate).toISOString().split('T')[0];
  
  return `${start}_to_${end}`;
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate?: number, endDate?: number): string {
  if (!startDate || !endDate) return 'Todo el período';
  
  const start = new Date(startDate).toLocaleDateString('es-ES');
  const end = new Date(endDate).toLocaleDateString('es-ES');
  
  return `${start} - ${end}`;
}
