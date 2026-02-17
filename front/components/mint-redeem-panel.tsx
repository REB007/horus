'use client';

import { useState } from 'react';
import type { Market } from '@/types/market';
import toast from 'react-hot-toast';

interface MintRedeemPanelProps {
  market: Market;
}

export function MintRedeemPanel({ market }: MintRedeemPanelProps) {
  const [mode, setMode] = useState<'mint' | 'redeem'>('mint');
  const [amount, setAmount] = useState('');

  const handleAction = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    toast.success(
      `${mode === 'mint' ? 'Minting' : 'Redeeming'} ${amount} USDC - Transaction would be sent to wallet`,
      { duration: 3000 }
    );
    setAmount('');
  };

  return (
    <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Mint / Redeem</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('mint')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            mode === 'mint'
              ? 'bg-yellow-600 text-gray-900 border-yellow-500'
              : 'bg-gray-900 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
          }`}
        >
          Mint
        </button>
        <button
          onClick={() => setMode('redeem')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2 ${
            mode === 'redeem'
              ? 'bg-yellow-600 text-gray-900 border-yellow-500'
              : 'bg-gray-900 text-gray-300 border-yellow-600/40 hover:border-yellow-500'
          }`}
        >
          Redeem
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {mode === 'mint' ? 'USDC Amount' : 'Token Pairs'}
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
            {mode === 'mint' ? "You'll receive:" : "You'll get back:"}
          </div>
          <div className="space-y-1">
            {mode === 'mint' ? (
              <>
                <div className="text-green-400 font-medium">{amount || '0'} YES tokens</div>
                <div className="text-red-400 font-medium">{amount || '0'} NO tokens</div>
              </>
            ) : (
              <div className="text-yellow-500 font-medium">{amount || '0'} USDC</div>
            )}
          </div>
        </div>

        <button
          onClick={handleAction}
          className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors border-2 border-yellow-500"
        >
          {mode === 'mint' ? 'Mint Tokens' : 'Redeem to USDC'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          {mode === 'mint'
            ? 'Deposit USDC to receive equal YES + NO tokens at 1:1 ratio'
            : 'Burn equal YES + NO tokens to get USDC back at 1:1 ratio'}
        </p>
      </div>
    </div>
  );
}
