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
      <div className="bg-[#1a1a1a] rounded-xl border border-[rgba(212,175,55,0.4)] p-6 cursor-pointer neo-hover neo-active transition-all" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = '6px 6px 0px rgba(212, 175, 55, 0.7)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = '4px 4px 0px rgba(212, 175, 55, 0.6)'} onMouseDown={(e) => e.currentTarget.style.boxShadow = '2px 2px 0px rgba(212, 175, 55, 0.5)'} onMouseUp={(e) => e.currentTarget.style.boxShadow = '6px 6px 0px rgba(212, 175, 55, 0.7)'}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            {market.question}
          </h3>

          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${isResolved && market.yesWins ? 'text-[#E8C547]' : 'text-[#999999]'}`}>YES</span>
              <span className="font-mono font-semibold text-[#4ADE80]">
                {formatPercentage(yesPrice)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-[#F87171]">
                {formatPercentage(noPrice)}
              </span>
              <span className={`font-medium ${isResolved && !market.yesWins ? 'text-[#E8C547]' : 'text-[#999999]'}`}>NO</span>
            </div>
          </div>

          <div className="w-full h-3 rounded-lg overflow-hidden flex border-2 border-[rgba(212,175,55,0.3)]" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
            <div
              className="bg-[#4ADE80] transition-all"
              style={{ width: `${yesPrice * 100}%` }}
            />
            <div
              className="bg-[#F87171] transition-all"
              style={{ width: `${noPrice * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-[#999999] pt-4 border-t border-[rgba(212,175,55,0.2)]">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="font-medium text-[#E8C547]">${formatUSDC(BigInt(market.totalVolume))}</span>
            <span className="text-[#666666]">volume</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className={isResolved ? 'text-[#E8C547] font-medium' : ''}>
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
