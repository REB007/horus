'use client';

import { useAccount, useSendTransaction } from 'wagmi';
import { Wallet, TrendingUp, Trophy } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Position, ClaimableWinning } from '@/types/market';
import { formatUSDC } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [claimable, setClaimable] = useState<ClaimableWinning[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { sendTransactionAsync } = useSendTransaction();

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [pos, clm] = await Promise.all([
          api.user.getPositions(address),
          api.user.getClaimable(address),
        ]);
        if (!cancelled) { setPositions(pos); setClaimable(clm); }
      } catch (e) {
        if (!cancelled) toast.error(`Failed to load portfolio: ${e}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [address]);

  const handleClaim = async (marketAddress: string, symbol: string) => {
    try {
      const tx = await api.trade.buildClaim(marketAddress);
      const hash = await sendTransactionAsync({ to: tx.to as `0x${string}`, data: tx.data as `0x${string}` });
      toast.success(`Claimed $${symbol} winnings! TX: ${hash.slice(0, 10)}…`);
      if (address) {
        const [pos, clm] = await Promise.all([api.user.getPositions(address), api.user.getClaimable(address)]);
        setPositions(pos); setClaimable(clm);
      }
    } catch (e) {
      toast.error(`Claim failed: ${e}`);
    }
  };

  const handleClaimAll = async () => {
    for (const c of claimable) {
      await handleClaim(c.marketAddress, c.tokenSymbol);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <Wallet className="h-16 w-16 text-[#E8C547] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-[#999999] mb-8">Connect your wallet to view your positions and claimable winnings</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </div>
      </div>
    );
  }

  const hasPositions = positions.some(
    (p) => BigInt(p.yesBalance) > 0n || BigInt(p.noBalance) > 0n || BigInt(p.lpBalance) > 0n
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>Portfolio</h1>
        <p className="text-[#999999]">Your positions and claimable winnings</p>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-[#666666] text-sm">Loading portfolio…</div>
      )}

      {claimable.length > 0 && (
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
            {claimable.map((claim) => (
              <div key={claim.marketAddress} className="bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link href={`/market/${claim.marketAddress}`} className="text-white font-medium hover:text-[#E8C547] transition-colors">
                      {claim.question}
                    </Link>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className={`font-medium ${claim.yesWins ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                        {claim.yesWins ? 'YES' : 'NO'} wins
                      </span>
                      <span className="text-[#999999]">
                        {formatUSDC(BigInt(claim.claimableAmount))} tokens → ${formatUSDC(BigInt(claim.claimableAmount))} USDC
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaim(claim.marketAddress, claim.tokenSymbol)}
                    className="px-4 py-2 bg-transparent text-[#E8C547] font-medium rounded-lg transition-all border-2 border-[rgba(212,175,55,0.5)] neo-hover neo-active"
                    style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}
                  >
                    Claim
                  </button>
                </div>
              </div>
            ))}
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
            <Link href="/" className="text-[#E8C547] hover:text-[#D4AF37] text-sm mt-2 inline-block">Browse markets →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => {
              const hasTokens = BigInt(position.yesBalance) > 0n || BigInt(position.noBalance) > 0n;
              const hasLp = BigInt(position.lpBalance) > 0n;
              if (!hasTokens && !hasLp) return null;

              return (
                <div key={position.marketAddress} className="bg-[#0a0a0a] border border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono text-[#666666]">${position.tokenSymbol}</span>
                    <Link href={`/market/${position.marketAddress}`} className="text-white font-medium hover:text-[#E8C547] transition-colors">
                      {position.question}
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {BigInt(position.yesBalance) > 0n && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">YES Balance</div>
                        <div className="text-[#4ADE80] font-medium">{formatUSDC(BigInt(position.yesBalance))}</div>
                      </div>
                    )}
                    {BigInt(position.noBalance) > 0n && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">NO Balance</div>
                        <div className="text-[#F87171] font-medium">{formatUSDC(BigInt(position.noBalance))}</div>
                      </div>
                    )}
                    {hasLp && (
                      <div>
                        <div className="text-[#666666] text-xs mb-1">LP Shares</div>
                        <div className="text-[#E8C547] font-medium">{formatUSDC(BigInt(position.lpBalance))}</div>
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
