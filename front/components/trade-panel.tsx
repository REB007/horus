'use client';

import { useState } from 'react';
import { useSendTransaction } from 'wagmi';
import { ArrowDownUp } from 'lucide-react';
import type { Market } from '@/types/market';
import { api } from '@/lib/api';
import { formatPercentage } from '@/lib/utils';
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
  const [isPending, setIsPending] = useState(false);

  const { sendTransactionAsync } = useSendTransaction();

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

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }
    setIsPending(true);
    try {
      const amountBase = String(Math.round(parseFloat(amount) * 1_000_000));

      if (mode === 'buy') {
        const approveTx = await api.trade.buildApprove(market.address, amountBase);
        await sendTransactionAsync({ to: approveTx.to as `0x${string}`, data: approveTx.data as `0x${string}` });
        const buyTx = await api.trade.buildBuy(market.address, side === 'yes', amountBase, '');
        const hash = await sendTransactionAsync({ to: buyTx.to as `0x${string}`, data: buyTx.data as `0x${string}` });
        toast.success(`Bought ${side.toUpperCase()} tokens! TX: ${hash.slice(0, 10)}…`);
      } else {
        const sellTx = await api.trade.buildSell(market.address, side === 'yes', amountBase, '');
        const hash = await sendTransactionAsync({ to: sellTx.to as `0x${string}`, data: sellTx.data as `0x${string}` });
        toast.success(`Sold ${side.toUpperCase()} tokens! TX: ${hash.slice(0, 10)}…`);
      }
      setAmount('');
    } catch (e) {
      toast.error(`Transaction failed: ${e}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            mode === 'buy'
              ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
              : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
          }`}
          style={{ boxShadow: mode === 'buy' ? '3px 3px 0px #0a0a0a' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
        >
          Buy
        </button>
        <button
          onClick={() => setMode('sell')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            mode === 'sell'
              ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] border-[#0a0a0a]'
              : 'bg-transparent text-[#999999] border-[rgba(212,175,55,0.25)]'
          }`}
          style={{ boxShadow: mode === 'sell' ? '3px 3px 0px #0a0a0a' : '2px 2px 0px rgba(212, 175, 55, 0.2)' }}
        >
          Sell
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSide('yes')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            side === 'yes'
              ? 'bg-[#4ADE80] text-white border-[rgba(74,222,128,0.6)]'
              : 'bg-transparent text-[#999999] border-[rgba(74,222,128,0.3)]'
          }`}
          style={{ boxShadow: side === 'yes' ? '3px 3px 0px rgba(74, 222, 128, 0.5)' : '2px 2px 0px rgba(74, 222, 128, 0.2)' }}
        >
          YES {formatPercentage(yesPrice)}
        </button>
        <button
          onClick={() => setSide('no')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all border-2 neo-hover neo-active ${
            side === 'no'
              ? 'bg-[#F87171] text-white border-[rgba(248,113,113,0.6)]'
              : 'bg-transparent text-[#999999] border-[rgba(248,113,113,0.3)]'
          }`}
          style={{ boxShadow: side === 'no' ? '3px 3px 0px rgba(248, 113, 113, 0.5)' : '2px 2px 0px rgba(248, 113, 113, 0.2)' }}
        >
          NO {formatPercentage(noPrice)}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#999999] mb-2">
            {mode === 'buy' ? 'USDC Amount' : `${side.toUpperCase()} Tokens`}
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

        <div className="flex items-center justify-center">
          <ArrowDownUp className="h-5 w-5 text-gray-500" />
        </div>

        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="text-sm text-[#999999] mb-1">You'll receive</div>
          <div className="text-2xl font-bold text-[#E8C547]">
            {mode === 'buy' ? estimateTokensOut(amount) : estimateUsdcOut(amount)}{' '}
            {mode === 'buy' ? side.toUpperCase() : 'USDC'}
          </div>
        </div>

        <button
          onClick={handleTrade}
          disabled={isPending}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
        >
          {isPending ? 'Confirming…' : `${mode === 'buy' ? 'Buy' : 'Sell'} ${side.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
