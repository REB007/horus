'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import { mockMarkets, calculateYesPrice } from '@/lib/mock-data';
import { formatUSDC, formatPercentage } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { TradePanel } from '@/components/trade-panel';
import { MintRedeemPanel } from '@/components/mint-redeem-panel';
import { ClaimPanel } from '@/components/claim-panel';
import { LiquidityPanel } from '@/components/liquidity-panel';

export default function MarketPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const router = useRouter();
  
  const market = mockMarkets.find((m) => m.address === address);

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Market not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-yellow-500 hover:text-yellow-400"
          >
            ← Back to markets
          </button>
        </div>
      </div>
    );
  }

  const yesPrice = calculateYesPrice(market.yesReserve, market.noReserve);
  const noPrice = 1 - yesPrice;
  const resolutionDate = new Date(market.resolutionTime * 1000);
  const isPast = resolutionDate < new Date();

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
            <h1 className="text-2xl font-bold text-white mb-6">{market.question}</h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0a0a0a] border-2 border-[rgba(74,222,128,0.4)] rounded-lg p-4" style={{ boxShadow: '3px 3px 0px rgba(74, 222, 128, 0.5)' }}>
                <div className="text-sm text-[#999999] mb-1">YES Price</div>
                <div className="text-3xl font-bold text-[#4ADE80]">
                  {formatPercentage(yesPrice)}
                </div>
              </div>
              <div className="bg-[#0a0a0a] border-2 border-[rgba(248,113,113,0.4)] rounded-lg p-4" style={{ boxShadow: '3px 3px 0px rgba(248, 113, 113, 0.5)' }}>
                <div className="text-sm text-[#999999] mb-1">NO Price</div>
                <div className="text-3xl font-bold text-[#F87171]">
                  {formatPercentage(noPrice)}
                </div>
              </div>
            </div>

            <div className="w-full h-4 rounded-lg overflow-hidden flex border-2 border-[rgba(212,175,55,0.3)] mb-6" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
              <div
                className="bg-[#4ADE80] transition-all"
                style={{ width: `${yesPrice * 100}%` }}
              />
              <div
                className="bg-[#F87171] transition-all"
                style={{ width: `${noPrice * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[#999999]">
                <TrendingUp className="h-4 w-4" />
                <span>Volume:</span>
                <span className="font-medium text-[#E8C547]">
                  ${formatUSDC(BigInt(market.totalVolume))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  {market.resolved
                    ? <span className="text-[#E8C547] font-medium">Resolved</span>
                    : isPast
                    ? 'Pending resolution'
                    : formatDistanceToNow(resolutionDate).replace(/^about /, '').replace(/^in /, '')}
                </span>
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

        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
            <h2 className="text-lg font-semibold text-white mb-4">Market Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[#999999] mb-1">Total Liquidity</div>
                <div className="text-white font-medium">
                  ${formatUSDC(BigInt(market.yesReserve) + BigInt(market.noReserve))}
                </div>
              </div>
              <div>
                <div className="text-[#999999] mb-1">YES Reserve</div>
                <div className="text-[#4ADE80] font-medium">
                  {formatUSDC(BigInt(market.yesReserve))} tokens
                </div>
              </div>
              <div>
                <div className="text-[#999999] mb-1">NO Reserve</div>
                <div className="text-[#F87171] font-medium">
                  {formatUSDC(BigInt(market.noReserve))} tokens
                </div>
              </div>
              <div className="pt-3 border-t border-[rgba(212,175,55,0.2)]">
                <div className="text-[#999999] mb-1">Market Address</div>
                <div className="text-xs text-[#666666] font-mono break-all">
                  {market.address}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
