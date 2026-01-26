'use client';

interface TableSelectorProps {
  selectedTable: 'products' | 'inventory' | 'movements';
  onTableChange: (table: 'products' | 'inventory' | 'movements') => void;
}

export function TableSelector({ selectedTable, onTableChange }: TableSelectorProps) {
  const tabs = [
    { id: 'products' as const, label: 'Productos', icon: '📦' },
    { id: 'inventory' as const, label: 'Inventario', icon: '📊' },
    { id: 'movements' as const, label: 'Movimientos', icon: '🔄' },
  ];

  return (
    <div className="w-full mb-6">
      <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
        <div className="flex gap-2 border-b border-gray-200 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTableChange(tab.id)}
              className={`
                px-4 py-3 text-sm font-medium transition-colors touch-target
                border-b-2 -mb-px whitespace-nowrap
                ${
                  selectedTable === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
