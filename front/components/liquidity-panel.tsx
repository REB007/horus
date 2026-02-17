'use client';

import { useState } from 'react';
import { Droplets } from 'lucide-react';
import type { Market } from '@/types/market';
import { formatUSDC } from '@/lib/utils';
import toast from 'react-hot-toast';

interface LiquidityPanelProps {
  market: Market;
}

export function LiquidityPanel({ market }: LiquidityPanelProps) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  
  const mockUserLpShares = '1234';
  const mockTotalLpShares = '50000';
  const poolPercentage = ((parseFloat(mockUserLpShares) / parseFloat(mockTotalLpShares)) * 100).toFixed(2);
  
  const totalLiquidity = BigInt(market.yesReserve) + BigInt(market.noReserve);

  const estimateLpShares = (usdcIn: string) => {
    if (!usdcIn || parseFloat(usdcIn) <= 0) return '0';
    const shares = (parseFloat(usdcIn) / Number(formatUSDC(totalLiquidity))) * parseFloat(mockTotalLpShares);
    return shares.toFixed(2);
  };

  const estimateUsdcOut = (lpSharesIn: string) => {
    if (!lpSharesIn || parseFloat(lpSharesIn) <= 0) return '0';
    const usdcValue = (parseFloat(lpSharesIn) / parseFloat(mockTotalLpShares)) * Number(formatUSDC(totalLiquidity));
    return usdcValue.toFixed(2);
  };

  const handleAction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    toast.success(
      `${mode === 'add' ? 'Adding' : 'Removing'} liquidity - Transaction would be sent to wallet`,
      { duration: 3000 }
    );
    setAmount('');
  };

  return (
    <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="h-5 w-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-gray-100">Liquidity Provider</h2>
      </div>

      {parseFloat(mockUserLpShares) > 0 && (
        <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-400 mb-3">Your LP Position</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">LP Shares</div>
              <div className="text-lg font-semibold text-yellow-500">{mockUserLpShares}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Pool Share</div>
              <div className="text-lg font-semibold text-yellow-500">{poolPercentage}%</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-yellow-600/20">
            <div className="text-xs text-gray-500 mb-1">Estimated Value</div>
            <div className="text-lg font-semibold text-gray-100">
              ${estimateUsdcOut(mockUserLpShares)} USDC
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('add')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            mode === 'add'
              ? 'bg-yellow-600 text-gray-900 border-yellow-500'
              : 'bg-gray-900 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
          }`}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setMode('remove')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            mode === 'remove'
              ? 'bg-yellow-600 text-gray-900 border-yellow-500'
              : 'bg-gray-900 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
          }`}
        >
          Remove Liquidity
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {mode === 'add' ? 'USDC Amount' : 'LP Shares'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>

        <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">
            {mode === 'add' ? "You'll receive:" : "You'll get back:"}
          </div>
          {mode === 'add' ? (
            <div className="space-y-1">
              <div className="text-yellow-500 font-medium">
                {estimateLpShares(amount)} LP shares
              </div>
              <div className="text-xs text-gray-500">
                Pool share: {((parseFloat(estimateLpShares(amount)) / parseFloat(mockTotalLpShares)) * 100).toFixed(4)}%
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-yellow-500 font-medium">
                ~{estimateUsdcOut(amount)} USDC
              </div>
              <div className="text-xs text-gray-500">
                Plus any excess YES/NO tokens
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleAction}
          className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors border-2 border-yellow-500"
        >
          {mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          {mode === 'add'
            ? 'Provide liquidity to earn 2% trading fees'
            : 'Remove your liquidity position and receive USDC + excess tokens'}
        </p>
      </div>
    </div>
  );
}
