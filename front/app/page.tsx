'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MarketCard } from '@/components/market-card';
import { MarketCardSkeleton } from '@/components/market-card-skeleton';
import { mockMarkets } from '@/lib/mock-data';

type FilterTab = 'all' | 'active' | 'resolved';
type SortOption = 'newest' | 'liquidity' | 'ending-soon';

export default function Home() {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('ending-soon');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(false);

  const filteredAndSortedMarkets = useMemo(() => {
    let markets = [...mockMarkets];

    if (filterTab === 'active') {
      markets = markets.filter((m) => !m.resolved);
    } else if (filterTab === 'resolved') {
      markets = markets.filter((m) => m.resolved);
    }

    if (searchQuery) {
      markets = markets.filter((m) =>
        m.question.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    markets.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'liquidity':
          return (parseInt(b.yesReserve) + parseInt(b.noReserve)) - (parseInt(a.yesReserve) + parseInt(a.noReserve));
        case 'ending-soon':
          return a.resolutionTime - b.resolutionTime;
        default:
          return 0;
      }
    });

    return markets;
  }, [filterTab, sortBy, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
                filterTab === 'all'
                  ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
                  : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
              }`}
              style={{ boxShadow: filterTab === 'all' ? '3px 3px 0px rgba(212, 175, 55, 0.6)' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
            >
              All
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
                filterTab === 'active'
                  ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
                  : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
              }`}
              style={{ boxShadow: filterTab === 'active' ? '3px 3px 0px rgba(212, 175, 55, 0.6)' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
            >
              Active
            </button>
            <button
              onClick={() => setFilterTab('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
                filterTab === 'resolved'
                  ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
                  : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
              }`}
              style={{ boxShadow: filterTab === 'resolved' ? '3px 3px 0px rgba(212, 175, 55, 0.6)' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
            >
              Resolved
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666666]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white placeholder-[#666666] rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors text-sm"
              style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-[#999999]">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 bg-[#1a1a1a] border-2 border-[rgba(212,175,55,0.4)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors font-medium"
              style={{ boxShadow: '3px 3px 0px rgba(212, 175, 55, 0.4)' }}
            >
              <option value="liquidity">Most Liquidity</option>
              <option value="newest">Newest</option>
              <option value="ending-soon">Ending Soon</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg shadow p-8 max-w-2xl mx-auto">
            <p className="text-gray-400">
              {searchQuery
                ? `No markets found matching "${searchQuery}"`
                : 'No markets available'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedMarkets.map((market) => (
            <MarketCard key={market.address} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
