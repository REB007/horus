'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Market } from '@/types/market';
import { formatPercentage } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ClaimPanelProps {
  market: Market;
  yesPrice: number;
  noPrice: number;
}

export function ClaimPanel({ market, yesPrice, noPrice }: ClaimPanelProps) {
  const [claimAmount, setClaimAmount] = useState('100');

  const handleClaim = () => {
    if (!claimAmount || parseFloat(claimAmount) <= 0) {
      toast.error('Please enter an amount to claim');
      return;
    }

    toast.success(
      `Claiming ${claimAmount} USDC - Transaction would be sent to wallet`,
      { duration: 3000 }
    );
    setClaimAmount('');
  };

  const winner = market.yesWins ? 'YES' : 'NO';
  const winnerColor = market.yesWins ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-[#1a1a1a] border-2 border-[rgba(212,175,55,0.5)] rounded-xl p-6" style={{ boxShadow: '6px 6px 0px rgba(212, 175, 55, 0.7)' }}>
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-[#E8C547]" />
        <h2 className="text-lg font-semibold text-white">Market Resolved</h2>
      </div>

      <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.4)] rounded-lg p-6 mb-6 text-center" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
        <div className="text-sm text-[#999999] mb-2">Winning Outcome</div>
        <div className={`text-4xl font-bold mb-2`} style={{ color: market.yesWins ? '#4ADE80' : '#F87171', textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>{winner}</div>
        <div className="text-[#E8C547] text-lg font-semibold">
          {market.yesWins ? formatPercentage(yesPrice) : formatPercentage(noPrice)}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#999999] mb-2">
            Your {winner} Tokens
          </label>
          <input
            type="number"
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors"
            style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
          />
        </div>

        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="text-sm text-[#999999] mb-1">You'll receive</div>
          <div className="text-2xl font-bold text-[#E8C547]">
            {claimAmount || '0'} USDC
          </div>
        </div>

        <button
          onClick={handleClaim}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active"
          style={{ boxShadow: '4px 4px 0px #0a0a0a' }}
        >
          Claim Winnings
        </button>

        <p className="text-xs text-[#666666] text-center">
          Winning tokens can be redeemed 1:1 for USDC
        </p>
      </div>
    </div>
  );
}
