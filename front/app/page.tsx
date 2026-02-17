'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MarketCard } from '@/components/market-card';
import { MarketCardSkeleton } from '@/components/market-card-skeleton';
import { mockMarkets } from '@/lib/mock-data';
import type { Market } from '@/types/market';

type FilterTab = 'all' | 'active' | 'resolved';
type SortOption = 'newest' | 'volume' | 'ending-soon';

export default function Home() {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('volume');
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
        case 'volume':
          return parseInt(b.totalVolume) - parseInt(a.totalVolume);
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-yellow-500">Prediction Markets</h1>
        <p className="text-gray-400">
          Trade on the outcome of future events with USDC on Base
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border-2 border-yellow-600/40 text-gray-100 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
                filterTab === 'all'
                  ? 'bg-yellow-600 text-gray-900 border-yellow-500'
                  : 'bg-gray-800 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
                filterTab === 'active'
                  ? 'bg-yellow-600 text-gray-900 border-yellow-500'
                  : 'bg-gray-800 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterTab('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
                filterTab === 'resolved'
                  ? 'bg-yellow-600 text-gray-900 border-yellow-500'
                  : 'bg-gray-800 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
              }`}
            >
              Resolved
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm font-medium text-gray-400">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 bg-gray-800 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="volume">Highest Volume</option>
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
