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
    <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="h-5 w-5 text-[#E8C547]" />
        <h2 className="text-lg font-semibold text-white">Liquidity Provider</h2>
      </div>

      {parseFloat(mockUserLpShares) > 0 && (
        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4 mb-6" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="text-sm text-[#999999] mb-3">Your LP Position</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#666666] mb-1">LP Shares</div>
              <div className="text-lg font-semibold text-[#E8C547]">{mockUserLpShares}</div>
            </div>
            <div>
              <div className="text-xs text-[#666666] mb-1">Pool Share</div>
              <div className="text-lg font-semibold text-[#E8C547]">{poolPercentage}%</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[rgba(212,175,55,0.2)]">
            <div className="text-xs text-[#666666] mb-1">Estimated Value</div>
            <div className="text-lg font-semibold text-white">
              ${estimateUsdcOut(mockUserLpShares)} USDC
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('add')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            mode === 'add'
              ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
              : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
          }`}
          style={{ boxShadow: mode === 'add' ? '3px 3px 0px #0a0a0a' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
        >
          Add Liquidity
        </button>
        <button
          onClick={() => setMode('remove')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            mode === 'remove'
              ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
              : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
          }`}
          style={{ boxShadow: mode === 'remove' ? '3px 3px 0px #0a0a0a' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
        >
          Remove Liquidity
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#999999] mb-2">
            {mode === 'add' ? 'USDC Amount' : 'LP Shares'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors"
            style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
          />
        </div>

        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="text-sm text-[#999999] mb-2">
            {mode === 'add' ? "You'll receive:" : "You'll get back:"}
          </div>
          {mode === 'add' ? (
            <div className="space-y-1">
              <div className="text-[#E8C547] font-medium">
                {estimateLpShares(amount)} LP shares
              </div>
              <div className="text-xs text-[#666666]">
                Pool share: {((parseFloat(estimateLpShares(amount)) / parseFloat(mockTotalLpShares)) * 100).toFixed(4)}%
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[#E8C547] font-medium">
                ~{estimateUsdcOut(amount)} USDC
              </div>
              <div className="text-xs text-[#666666]">
                Plus any excess YES/NO tokens
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleAction}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active"
          style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
        >
          {mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
        </button>

        <p className="text-xs text-[#666666] text-center">
          {mode === 'add'
            ? 'Provide liquidity to earn 2% trading fees'
            : 'Remove your liquidity position and receive USDC + excess tokens'}
        </p>
      </div>
    </div>
  );
}
