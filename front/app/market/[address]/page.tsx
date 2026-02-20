'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Clock, Droplets, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { formatUSDC, formatPercentage, bpsToFloat } from '@/lib/utils';
import { TradePanel } from '@/components/trade-panel';
import { MintRedeemPanel } from '@/components/mint-redeem-panel';
import { ClaimPanel } from '@/components/claim-panel';
import { LiquidityPanel } from '@/components/liquidity-panel';
import type { Market } from '@/types/market';

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

export default function MarketPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const router = useRouter();

  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarket = useCallback(async (isFirst: boolean) => {
    try {
      const data = await api.markets.get(address);
      setMarket(data);
      setError(null);
    } catch (e) {
      if (isFirst) setError(String(e));
    } finally {
      if (isFirst) setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadMarket(true);
    const interval = setInterval(() => loadMarket(false), 10_000);
    return () => clearInterval(interval);
  }, [loadMarket]);

  const secsLeft = useCountdown(market?.resolutionTime ?? 0);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-[#1a1a1a] rounded" />
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
          <div className="h-48 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Market not found</h1>
          {error && <p className="text-[#F87171] text-sm mb-4">{error}</p>}
          <button onClick={() => router.push('/')} className="text-yellow-500 hover:text-yellow-400">
            ← Back to markets
          </button>
        </div>
      </div>
    );
  }

  const yesPrice = bpsToFloat(market.yesPrice ?? 5000);
  const noPrice = bpsToFloat(market.noPrice ?? 5000);
  const liquidity = BigInt(market.yesReserve ?? '0') + BigInt(market.noReserve ?? '0');

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-[#999999] hover:text-[#E8C547] mb-6 transition-colors neo-hover font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to markets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>

            {/* Token header */}
            <div className="flex items-center gap-3 mb-4">
              {market.tokenImg ? (
                <Image src={market.tokenImg} alt={market.tokenSymbol} width={44} height={44} className="rounded-full border-2 border-[rgba(212,175,55,0.4)]" unoptimized />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#2a2a2a] border-2 border-[rgba(212,175,55,0.3)] flex items-center justify-center text-sm font-bold text-[#E8C547]">
                  {market.tokenSymbol.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="text-xs text-[#666666] font-mono">${market.tokenSymbol} · {market.tokenName}</div>
                <h1 className="text-xl font-bold text-white">{market.question}</h1>
              </div>
            </div>

            {/* Countdown */}
            <div className={`flex items-center gap-2 mb-5 text-sm font-mono font-semibold ${market.resolved ? 'text-[#E8C547]' : secsLeft < 60 && secsLeft > 0 ? 'text-[#F87171]' : 'text-[#999999]'}`}>
              <Clock className="h-4 w-4" />
              {market.resolved
                ? (market.yesWins ? '✓ YES wins — market resolved' : '✗ NO wins — market resolved')
                : formatCountdown(secsLeft)}
            </div>

            {/* Price cards */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-[#0a0a0a] border-2 border-[rgba(74,222,128,0.4)] rounded-lg p-4" style={{ boxShadow: '3px 3px 0px rgba(74, 222, 128, 0.5)' }}>
                <div className="text-sm text-[#999999] mb-1">YES</div>
                <div className="text-3xl font-bold text-[#4ADE80]">{formatPercentage(yesPrice)}</div>
              </div>
              <div className="bg-[#0a0a0a] border-2 border-[rgba(248,113,113,0.4)] rounded-lg p-4" style={{ boxShadow: '3px 3px 0px rgba(248, 113, 113, 0.5)' }}>
                <div className="text-sm text-[#999999] mb-1">NO</div>
                <div className="text-3xl font-bold text-[#F87171]">{formatPercentage(noPrice)}</div>
              </div>
            </div>

            {/* Probability bar */}
            <div className="w-full h-4 rounded-lg overflow-hidden flex border-2 border-[rgba(212,175,55,0.3)] mb-5" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
              <div className="bg-[#4ADE80] transition-all" style={{ width: `${yesPrice * 100}%` }} />
              <div className="bg-[#F87171] transition-all" style={{ width: `${noPrice * 100}%` }} />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 text-sm text-[#999999]">
              <div className="flex items-center gap-1.5">
                <Droplets className="h-4 w-4" />
                <span className="text-[#E8C547] font-medium">${formatUSDC(liquidity)}</span>
                <span className="text-[#666666]">liquidity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                <span className="text-[#999999]">tick {market.currentTick > market.snapshotTick ? '↑' : market.currentTick < market.snapshotTick ? '↓' : '—'}</span>
                <span className="text-[#666666] font-mono text-xs">{market.currentTick}</span>
              </div>
            </div>
          </div>

          {market.resolved ? (
            <ClaimPanel market={market} yesPrice={yesPrice} noPrice={noPrice} />
          ) : (
            <>
              <TradePanel market={market} yesPrice={yesPrice} noPrice={noPrice} />
              <MintRedeemPanel market={market} />
              <LiquidityPanel market={market} />
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
            <h2 className="text-lg font-semibold text-white mb-4">Market Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[#999999] mb-1">Total Liquidity</div>
                <div className="text-white font-medium">${formatUSDC(liquidity)}</div>
              </div>
              <div>
                <div className="text-[#999999] mb-1">YES Reserve</div>
                <div className="text-[#4ADE80] font-medium">{formatUSDC(BigInt(market.yesReserve ?? '0'))} tokens</div>
              </div>
              <div>
                <div className="text-[#999999] mb-1">NO Reserve</div>
                <div className="text-[#F87171] font-medium">{formatUSDC(BigInt(market.noReserve ?? '0'))} tokens</div>
              </div>
              <div className="pt-3 border-t border-[rgba(212,175,55,0.2)]">
                <div className="text-[#999999] mb-1">Oracle (Uniswap V3)</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-[#666666]">Snapshot tick</div>
                    <div className="text-white">{market.snapshotTick}</div>
                  </div>
                  <div>
                    <div className="text-[#666666]">Current tick</div>
                    <div className={market.currentTick > market.snapshotTick ? 'text-[#4ADE80]' : market.currentTick < market.snapshotTick ? 'text-[#F87171]' : 'text-white'}>
                      {market.currentTick}
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-[rgba(212,175,55,0.2)]">
                <div className="text-[#999999] mb-1">Market Address</div>
                <div className="text-xs text-[#666666] font-mono break-all">{market.address}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
