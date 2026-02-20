'use client';

import { useState } from 'react';
import { useSendTransaction, useAccount, useReadContract } from 'wagmi';
import { Trophy } from 'lucide-react';
import type { Market } from '@/types/market';
import { api } from '@/lib/api';
import { formatPercentage, formatUSDC } from '@/lib/utils';
import toast from 'react-hot-toast';

const ERC20_BALANCE_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

interface ClaimPanelProps {
  market: Market;
  yesPrice: number;
  noPrice: number;
}

export function ClaimPanel({ market, yesPrice, noPrice }: ClaimPanelProps) {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const { sendTransactionAsync } = useSendTransaction();

  const winningTokenAddress = market.yesWins ? market.yesTokenAddress : market.noTokenAddress;
  const winner = market.yesWins ? 'YES' : 'NO';

  const { data: winningBalance } = useReadContract({
    address: winningTokenAddress as `0x${string}`,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!winningTokenAddress },
  });

  const balance = (winningBalance as bigint) ?? 0n;

  const handleClaim = async () => {
    if (balance === 0n) {
      toast.error('No winning tokens to claim');
      return;
    }
    setIsPending(true);
    try {
      const tx = await api.trade.buildClaim(market.address);
      const hash = await sendTransactionAsync({ to: tx.to as `0x${string}`, data: tx.data as `0x${string}` });
      toast.success(`Claimed ${formatUSDC(balance)} USDC! TX: ${hash.slice(0, 10)}…`);
    } catch (e) {
      toast.error(`Claim failed: ${e}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border-2 border-[rgba(212,175,55,0.5)] rounded-xl p-6" style={{ boxShadow: '6px 6px 0px rgba(212, 175, 55, 0.7)' }}>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-[#E8C547]" />
        <h2 className="text-lg font-semibold text-white">Market Resolved</h2>
      </div>

      <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.4)] rounded-lg p-6 mb-6 text-center" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
        <div className="text-sm text-[#999999] mb-2">Winning Outcome</div>
        <div className="text-4xl font-bold mb-2" style={{ color: market.yesWins ? '#4ADE80' : '#F87171', textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>
          {winner}
        </div>
        <div className="text-[#E8C547] text-lg font-semibold">
          {market.yesWins ? formatPercentage(yesPrice) : formatPercentage(noPrice)}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm text-[#999999]">Your {winner} tokens</div>
            <div className="text-sm font-medium text-white">{formatUSDC(balance)}</div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-[#999999]">You&apos;ll receive</div>
            <div className="text-xl font-bold text-[#E8C547]">${formatUSDC(balance)} USDC</div>
          </div>
        </div>

        <button
          onClick={handleClaim}
          disabled={balance === 0n || isPending}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: '4px 4px 0px #0a0a0a' }}
        >
          {isPending ? 'Confirming\u2026' : balance === 0n ? 'Nothing to Claim' : 'Claim All Winnings'}
        </button>

        <p className="text-xs text-[#666666] text-center">
          Winning tokens are redeemed 1:1 for USDC
        </p>
      </div>
    </div>
  );
}
