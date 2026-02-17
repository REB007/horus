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
        className="flex items-center gap-2 text-gray-400 hover:text-yellow-500 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to markets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-100 mb-6">{market.question}</h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">YES Price</div>
                <div className="text-3xl font-bold text-green-400">
                  {formatPercentage(yesPrice)}
                </div>
              </div>
              <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">NO Price</div>
                <div className="text-3xl font-bold text-red-400">
                  {formatPercentage(noPrice)}
                </div>
              </div>
            </div>

            <div className="w-full h-4 rounded-full overflow-hidden flex border border-yellow-600/20 mb-6">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${yesPrice * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${noPrice * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <TrendingUp className="h-4 w-4" />
                <span>Volume:</span>
                <span className="font-medium text-yellow-500">
                  ${formatUSDC(BigInt(market.totalVolume))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  {market.resolved
                    ? <span className="text-yellow-500">Resolved</span>
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
          <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Market Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Total Liquidity</div>
                <div className="text-gray-100 font-medium">
                  ${formatUSDC(BigInt(market.yesReserve) + BigInt(market.noReserve))}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">YES Reserve</div>
                <div className="text-green-400 font-medium">
                  {formatUSDC(BigInt(market.yesReserve))} tokens
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">NO Reserve</div>
                <div className="text-red-400 font-medium">
                  {formatUSDC(BigInt(market.noReserve))} tokens
                </div>
              </div>
              <div className="pt-3 border-t border-yellow-600/20">
                <div className="text-gray-400 mb-1">Market Address</div>
                <div className="text-xs text-gray-500 font-mono break-all">
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
