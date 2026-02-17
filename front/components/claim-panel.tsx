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
    <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <h2 className="text-lg font-semibold text-gray-100">Market Resolved</h2>
      </div>

      <div className="bg-gray-900 border-2 border-yellow-600/40 rounded-lg p-6 mb-6 text-center">
        <div className="text-sm text-gray-400 mb-2">Winning Outcome</div>
        <div className={`text-4xl font-bold ${winnerColor} mb-2`}>{winner}</div>
        <div className="text-yellow-500 text-lg">
          {market.yesWins ? formatPercentage(yesPrice) : formatPercentage(noPrice)}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Your {winner} Tokens
          </label>
          <input
            type="number"
            value={claimAmount}
            onChange={(e) => setClaimAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>

        <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">You'll receive</div>
          <div className="text-2xl font-bold text-yellow-500">
            {claimAmount || '0'} USDC
          </div>
        </div>

        <button
          onClick={handleClaim}
          className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors border-2 border-yellow-500"
        >
          Claim Winnings
        </button>

        <p className="text-xs text-gray-500 text-center">
          Winning tokens can be redeemed 1:1 for USDC
        </p>
      </div>
    </div>
  );
}
