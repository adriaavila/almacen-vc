export interface InventoryItem {
  id: string;
  productName: string;
  category: string;
  presentation: string; // Unit/Box/Kg format
  currentStock: number;
  complexQuantity?: string; // Helper text like "3 + 48 + (6x12)"
}

export const mockInventoryItems: InventoryItem[] = [
  {
    id: '1',
    productName: 'Leche',
    category: 'Lácteos',
    presentation: 'Litro',
    currentStock: 12,
    complexQuantity: '3 + 48 + (6x12)',
  },
  {
    id: '2',
    productName: 'Arroz Premium',
    category: 'Granos',
    presentation: 'Kg',
    currentStock: 4,
    complexQuantity: '2 + 24 + (4x6)',
  },
  {
    id: '3',
    productName: 'Harina Pan',
    category: 'Harinas',
    presentation: 'Kg',
    currentStock: 8,
    complexQuantity: '1 + 12 + (2x6)',
  },
  {
    id: '4',
    productName: 'Queso Gouda',
    category: 'Lácteos',
    presentation: 'Kg',
    currentStock: 3,
    complexQuantity: '1 + 6 + (1x6)',
  },
  {
    id: '5',
    productName: 'Atún',
    category: 'Conservas',
    presentation: 'Lata',
    currentStock: 6,
    complexQuantity: '2 + 24 + (4x6)',
  },
  {
    id: '6',
    productName: 'Café',
    category: 'Bebidas',
    presentation: 'Kg',
    currentStock: 2,
    complexQuantity: '1 + 12 + (2x6)',
  },
];
