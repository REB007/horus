'use client';

import { useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import type { Market } from '@/types/market';
import { formatPercentage, parseUSDC, formatUSDC } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TradePanelProps {
  market: Market;
  yesPrice: number;
  noPrice: number;
}

export function TradePanel({ market, yesPrice, noPrice }: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');

  const estimateTokensOut = (usdcIn: string) => {
    if (!usdcIn || parseFloat(usdcIn) <= 0) return '0';
    const price = side === 'yes' ? yesPrice : noPrice;
    const tokens = parseFloat(usdcIn) / price;
    return tokens.toFixed(2);
  };

  const estimateUsdcOut = (tokensIn: string) => {
    if (!tokensIn || parseFloat(tokensIn) <= 0) return '0';
    const price = side === 'yes' ? yesPrice : noPrice;
    const usdc = parseFloat(tokensIn) * price;
    return usdc.toFixed(2);
  };

  const handleTrade = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    toast.success(
      `${mode === 'buy' ? 'Buying' : 'Selling'} ${side.toUpperCase()} - Transaction would be sent to wallet`,
      { duration: 3000 }
    );
    setAmount('');
  };

  return (
    <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            mode === 'buy'
              ? 'bg-yellow-600 text-gray-900 border-yellow-500'
              : 'bg-gray-900 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            mode === 'sell'
              ? 'bg-yellow-600 text-gray-900 border-yellow-500'
              : 'bg-gray-900 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSide('yes')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            side === 'yes'
              ? 'bg-green-600 text-white border-green-500'
              : 'bg-gray-900 text-gray-300 border-green-600/40 hover:border-green-500'
          }`}
        >
          YES {formatPercentage(yesPrice)}
        </button>
        <button
          onClick={() => setSide('no')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            side === 'no'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-gray-900 text-gray-300 border-red-600/40 hover:border-red-500'
          }`}
        >
          NO {formatPercentage(noPrice)}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {mode === 'buy' ? 'USDC Amount' : `${side.toUpperCase()} Tokens`}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>

        <div className="flex items-center justify-center">
          <ArrowDownUp className="h-5 w-5 text-gray-500" />
        </div>

        <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">You'll receive</div>
          <div className="text-2xl font-bold text-yellow-500">
            {mode === 'buy' ? estimateTokensOut(amount) : estimateUsdcOut(amount)}{' '}
            {mode === 'buy' ? side.toUpperCase() : 'USDC'}
          </div>
        </div>

        <button
          onClick={handleTrade}
          className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors border-2 border-yellow-500"
        >
          {mode === 'buy' ? 'Buy' : 'Sell'} {side.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
