'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Droplets } from 'lucide-react';
import type { Market } from '@/types/market';
import { formatUSDC, formatPercentage, bpsToFloat } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface MarketCardProps {
  market: Market;
}

function useCountdown(resolutionTime: number) {
  const [secsLeft, setSecsLeft] = useState(resolutionTime - Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecsLeft(resolutionTime - Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [resolutionTime]);
  return secsLeft;
}

function formatCountdown(secs: number): string {
  if (secs <= 0) return 'Pending resolution';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPrice = bpsToFloat(market.yesPrice ?? 5000);
  const noPrice = bpsToFloat(market.noPrice ?? 5000);
  const isResolved = market.resolved;
  const secsLeft = useCountdown(market.resolutionTime);
  const liquidity = BigInt(market.yesReserve ?? '0') + BigInt(market.noReserve ?? '0');

  return (
    <Link href={`/market/${market.address}`}>
      <div
        className="bg-[#1a1a1a] rounded-xl border border-[rgba(212,175,55,0.4)] p-6 cursor-pointer neo-hover neo-active transition-all"
        style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '6px 6px 0px rgba(212, 175, 55, 0.7)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '4px 4px 0px rgba(212, 175, 55, 0.6)'}
        onMouseDown={(e) => e.currentTarget.style.boxShadow = '2px 2px 0px rgba(212, 175, 55, 0.5)'}
        onMouseUp={(e) => e.currentTarget.style.boxShadow = '6px 6px 0px rgba(212, 175, 55, 0.7)'}
      >
        <div className="flex items-center gap-3 mb-4">
          {market.tokenImg ? (
            <Image src={market.tokenImg} alt={market.tokenSymbol} width={36} height={36} className="rounded-full border border-[rgba(212,175,55,0.4)]" unoptimized />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-xs font-bold text-[#E8C547]">
              {market.tokenSymbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="text-xs text-[#666666] font-mono">${market.tokenSymbol}</div>
            <div className="text-white font-semibold text-sm leading-tight">{market.question}</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-xs ${isResolved && market.yesWins ? 'text-[#E8C547]' : 'text-[#999999]'}`}>YES</span>
            <span className="font-mono font-semibold text-[#4ADE80]">{formatPercentage(yesPrice)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-[#F87171]">{formatPercentage(noPrice)}</span>
            <span className={`font-medium text-xs ${isResolved && !market.yesWins ? 'text-[#E8C547]' : 'text-[#999999]'}`}>NO</span>
          </div>
        </div>

        <div className="w-full h-3 rounded-lg overflow-hidden flex border-2 border-[rgba(212,175,55,0.3)] mb-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-[#4ADE80] transition-all" style={{ width: `${yesPrice * 100}%` }} />
          <div className="bg-[#F87171] transition-all" style={{ width: `${noPrice * 100}%` }} />
        </div>

        <div className="flex items-center justify-between text-sm text-[#999999] pt-3 border-t border-[rgba(212,175,55,0.2)]">
          <div className="flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5" />
            <span className="font-medium text-[#E8C547]">${formatUSDC(liquidity)}</span>
            <span className="text-[#666666] text-xs">liq</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span className={isResolved ? 'text-[#E8C547] font-medium' : secsLeft < 60 && secsLeft > 0 ? 'text-[#F87171] font-mono font-semibold' : 'font-mono'}>
              {isResolved ? (market.yesWins ? '✓ YES wins' : '✗ NO wins') : formatCountdown(secsLeft)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
