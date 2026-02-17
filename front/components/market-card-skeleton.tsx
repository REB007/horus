export function MarketCardSkeleton() {
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[rgba(212,175,55,0.4)] p-6 animate-pulse" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="h-6 bg-[#2a2a2a] rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-[#2a2a2a] rounded w-1/2 mb-6"></div>
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

      <div className="flex justify-between pt-4 border-t border-[rgba(212,175,55,0.2)]">
        <div className="h-4 bg-[#2a2a2a] rounded w-24"></div>
        <div className="h-4 bg-[#2a2a2a] rounded w-20"></div>
      </div>
    </div>
  );
}
