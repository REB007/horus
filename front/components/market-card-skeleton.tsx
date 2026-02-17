export function MarketCardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg border-2 border-yellow-600/40 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-16 bg-gray-700 rounded-full"></div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <div className="h-4 w-12 bg-gray-700 rounded"></div>
            <div className="h-4 w-16 bg-gray-700 rounded"></div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 border border-yellow-600/20"></div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-yellow-600/20">
        <div className="h-4 w-24 bg-gray-700 rounded"></div>
        <div className="h-4 w-32 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}
