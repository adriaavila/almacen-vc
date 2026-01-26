'use client';

interface StatsCardsProps {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  filteredItems: number;
}

export function StatsCards({
  totalItems,
  activeItems,
  lowStockItems,
  filteredItems,
}: StatsCardsProps) {
  const coverage = totalItems > 0 ? ((totalItems - lowStockItems) / totalItems * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow col-span-2 sm:col-span-1 lg:col-span-1">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Total Items
            </p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredItems}</p>
            {filteredItems !== totalItems && (
              <p className="text-xs text-gray-500 mt-1">de {totalItems} total</p>
            )}
          </div>
          <div className="p-2 sm:p-3 bg-blue-50 rounded-lg flex-shrink-0 ml-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Active Items */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Activos
            </p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{activeItems}</p>
            <p className="text-xs text-gray-500 mt-1">
              {totalItems > 0 ? ((activeItems / totalItems) * 100).toFixed(1) : '0'}%
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-emerald-50 rounded-lg flex-shrink-0 ml-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Low Stock */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Bajo Stock
            </p>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{lowStockItems}</p>
            <p className="text-xs text-gray-500 mt-1">
              {totalItems > 0 ? ((lowStockItems / totalItems) * 100).toFixed(1) : '0'}%
            </p>
          </div>
          <div className="p-2 sm:p-3 bg-red-50 rounded-lg flex-shrink-0 ml-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Coverage */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Cobertura
            </p>
            <p className="text-2xl font-bold text-blue-600">{coverage}%</p>
            <p className="text-xs text-gray-500 mt-1">Stock suficiente</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
