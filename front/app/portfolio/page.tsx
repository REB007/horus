'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Wallet, TrendingUp, Droplets, Trophy } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { mockMarkets, calculateYesPrice } from '@/lib/mock-data';
import { formatUSDC, formatPercentage } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();

  const mockPositions = [
    {
      marketAddress: mockMarkets[0].address,
      question: mockMarkets[0].question,
      yesBalance: '150',
      noBalance: '0',
      lpShares: '0',
    },
    {
      marketAddress: mockMarkets[1].address,
      question: mockMarkets[1].question,
      yesBalance: '0',
      noBalance: '200',
      lpShares: '0',
    },
    {
      marketAddress: mockMarkets[2].address,
      question: mockMarkets[2].question,
      yesBalance: '50',
      noBalance: '50',
      lpShares: '1234',
    },
  ];

  const mockClaimable = [
    {
      marketAddress: mockMarkets[4].address,
      question: mockMarkets[4].question,
      yesWins: true,
      winningBalance: '150',
    },
  ];

  const handleClaim = (marketAddress: string, amount: string) => {
    toast.success(`Claiming ${amount} USDC - Transaction would be sent to wallet`, {
      duration: 3000,
    });
  };

  const handleClaimAll = () => {
    const total = mockClaimable.reduce((sum, c) => sum + parseFloat(c.winningBalance), 0);
    toast.success(`Claiming ${total} USDC from ${mockClaimable.length} markets - Transaction would be sent to wallet`, {
      duration: 3000,
    });
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <Wallet className="h-16 w-16 text-[#E8C547] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-[#999999] mb-8">
            Connect your wallet to view your positions and claimable winnings
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  const hasPositions = mockPositions.some(
    (p) => parseFloat(p.yesBalance) > 0 || parseFloat(p.noBalance) > 0 || parseFloat(p.lpShares) > 0
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>Portfolio</h1>
        <p className="text-[#999999]">Your positions and claimable winnings</p>
      </div>

      {mockClaimable.length > 0 && (
        <div className="bg-[#1a1a1a] border-2 border-[rgba(212,175,55,0.5)] rounded-xl p-6 mb-6" style={{ boxShadow: '6px 6px 0px rgba(212, 175, 55, 0.7)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-[#E8C547]" />
              <h2 className="text-xl font-semibold text-white">Claimable Winnings</h2>
            </div>
            <button
              onClick={handleClaimAll}
              className="px-4 py-2 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active"
              style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
            >
              Claim All
            </button>
          </div>

          <div className="space-y-4">
            {mockClaimable.map((claim) => {
              const market = mockMarkets.find((m) => m.address === claim.marketAddress);
              if (!market) return null;

              return (
                <div
                  key={claim.marketAddress}
                  className="bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        href={`/market/${claim.marketAddress}`}
                        className="text-white font-medium hover:text-[#E8C547] transition-colors"
                      >
                        {claim.question}
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-[#E8C547] font-medium">
                          {claim.yesWins ? 'YES' : 'NO'} wins
                        </span>
                        <span className="text-[#999999]">
                          {claim.winningBalance} tokens → {claim.winningBalance} USDC
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaim(claim.marketAddress, claim.winningBalance)}
                      className="px-4 py-2 bg-transparent text-[#E8C547] font-medium rounded-lg transition-all border-2 border-[rgba(212,175,55,0.5)] neo-hover neo-active"
                      style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}
                    >
                      Claim
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6 mb-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-[#E8C547]" />
          <h2 className="text-xl font-semibold text-white">Active Positions</h2>
        </div>

        {!hasPositions ? (
          <div className="text-center py-12">
            <p className="text-[#999999]">No active positions</p>
            <Link
              href="/"
              className="text-[#E8C547] hover:text-[#D4AF37] text-sm mt-2 inline-block"
            >
              Browse markets →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mockPositions.map((position) => {
              const market = mockMarkets.find((m) => m.address === position.marketAddress);
              if (!market) return null;

              const yesPrice = calculateYesPrice(market.yesReserve, market.noReserve);
              const noPrice = 1 - yesPrice;
              const yesValue = parseFloat(position.yesBalance) * yesPrice;
              const noValue = parseFloat(position.noBalance) * noPrice;
              const totalValue = yesValue + noValue;

              const hasTokens = parseFloat(position.yesBalance) > 0 || parseFloat(position.noBalance) > 0;
              const hasLp = parseFloat(position.lpShares) > 0;

              if (!hasTokens && !hasLp) return null;

              return (
                <div
                  key={position.marketAddress}
                  className="bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}
                >
                  <Link
                    href={`/market/${position.marketAddress}`}
                    className="text-white font-medium hover:text-[#E8C547] transition-colors block mb-3"
                  >
                    {position.question}
                  </Link>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {parseFloat(position.yesBalance) > 0 && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">YES Balance</div>
                        <div className="text-[#4ADE80] font-medium">{position.yesBalance}</div>
                        <div className="text-[#666666] text-xs">${yesValue.toFixed(2)}</div>
                      </div>
                    )}
                    {parseFloat(position.noBalance) > 0 && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">NO Balance</div>
                        <div className="text-[#F87171] font-medium">{position.noBalance}</div>
                        <div className="text-[#666666] text-xs">${noValue.toFixed(2)}</div>
                      </div>
                    )}
                    {hasTokens && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">Total Value</div>
                        <div className="text-[#E8C547] font-medium">${totalValue.toFixed(2)}</div>
                      </div>
                    )}
                    {hasLp && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">LP Shares</div>
                        <div className="text-[#E8C547] font-medium">{position.lpShares}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
