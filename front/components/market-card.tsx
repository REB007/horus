'use client';

import Link from 'next/link';
import { Clock, TrendingUp } from 'lucide-react';
import type { Market } from '@/types/market';
import { formatUSDC, formatPercentage } from '@/lib/utils';
import { calculateYesPrice } from '@/lib/mock-data';
import { formatDistanceToNow } from 'date-fns';

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPrice = calculateYesPrice(market.yesReserve, market.noReserve);
  const noPrice = 1 - yesPrice;
  const isResolved = market.resolved;
  const resolutionDate = new Date(market.resolutionTime * 1000);
  const isPast = resolutionDate < new Date();

  return (
    <Link href={`/market/${market.address}`}>
      <div className="bg-gray-800 rounded-lg border-2 border-yellow-600/40 p-6 hover:border-yellow-500 hover:shadow-xl hover:shadow-yellow-600/20 transition-all cursor-pointer">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            {market.question}
          </h3>

          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isResolved && market.yesWins ? 'text-yellow-500' : 'text-gray-400'}`}>YES</span>
              <span className="font-mono font-semibold text-green-400">
                {formatPercentage(yesPrice)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-red-400">
                {formatPercentage(noPrice)}
              </span>
              <span className={`font-medium ${isResolved && !market.yesWins ? 'text-yellow-500' : 'text-gray-400'}`}>NO</span>
            </div>
          </div>

          <div className="w-full h-3 rounded-full overflow-hidden flex border border-yellow-600/20">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${yesPrice * 100}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${noPrice * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-yellow-600/20">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium text-yellow-500">${formatUSDC(BigInt(market.totalVolume))}</span>
            <span className="text-gray-500">volume</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className={isResolved ? 'text-yellow-500' : ''}>
              {isResolved
                ? 'Resolved'
                : isPast
                ? 'Pending resolution'
                : formatDistanceToNow(resolutionDate).replace(/^about /, '').replace(/^in /, '')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
