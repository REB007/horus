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
    <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
      <h2 className="text-lg font-semibold text-white mb-4">Mint / Redeem</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('mint')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            mode === 'mint'
              ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
              : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
          }`}
          style={{ boxShadow: mode === 'mint' ? '3px 3px 0px #0a0a0a' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
        >
          Mint
        </button>
        <button
          onClick={() => setMode('redeem')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            mode === 'redeem'
              ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
              : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
          }`}
          style={{ boxShadow: mode === 'redeem' ? '3px 3px 0px #0a0a0a' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
        >
          Redeem
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#999999] mb-2">
            {mode === 'mint' ? 'USDC Amount' : 'Token Pairs'}
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
            {mode === 'mint' ? "You'll receive:" : "You'll get back:"}
          </div>
          <div className="space-y-1">
            {mode === 'mint' ? (
              <>
                <div className="text-[#4ADE80] font-medium">{amount || '0'} YES tokens</div>
                <div className="text-[#F87171] font-medium">{amount || '0'} NO tokens</div>
              </>
            ) : (
              <div className="text-[#E8C547] font-medium">{amount || '0'} USDC</div>
            )}
          </div>
        </div>

        <button
          onClick={handleAction}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active"
          style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
        >
          {mode === 'mint' ? 'Mint Tokens' : 'Redeem to USDC'}
        </button>

        <p className="text-xs text-[#666666] text-center">
          {mode === 'mint'
            ? 'Deposit USDC to receive equal YES + NO tokens at 1:1 ratio'
            : 'Burn equal YES + NO tokens to get USDC back at 1:1 ratio'}
        </p>
      </div>
    </div>
  );
}
