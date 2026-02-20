'use client';

import { useState } from 'react';
import { useSendTransaction, useAccount, useReadContract } from 'wagmi';
import { Droplets } from 'lucide-react';
import type { Market } from '@/types/market';
import { api } from '@/lib/api';
import { formatUSDC } from '@/lib/utils';
import toast from 'react-hot-toast';

const MARKET_ABI = [
  { name: 'lpBalances', type: 'function', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'totalLpSupply', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

interface LiquidityPanelProps {
  market: Market;
}

export function LiquidityPanel({ market }: LiquidityPanelProps) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('');
  const [isPending, setIsPending] = useState(false);

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const { data: userLpRaw } = useReadContract({
    address: market.address as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'lpBalances',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: totalLpRaw } = useReadContract({
    address: market.address as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'totalLpSupply',
  });

  const userLp = (userLpRaw as bigint) ?? 0n;
  const totalLp = (totalLpRaw as bigint) ?? 0n;
  const poolPercentage = totalLp > 0n ? ((Number(userLp) / Number(totalLp)) * 100).toFixed(2) : '0.00';
  const totalLiquidity = BigInt(market.yesReserve ?? '0') + BigInt(market.noReserve ?? '0');

  const estimateLpShares = (usdcIn: string) => {
    if (!usdcIn || parseFloat(usdcIn) <= 0) return '0';
    if (totalLp === 0n || totalLiquidity === 0n) return usdcIn;
    const shares = (parseFloat(usdcIn) * 1e6 * Number(totalLp)) / Number(totalLiquidity);
    return (shares / 1e6).toFixed(2);
  };

  const estimateUsdcOut = (lpSharesIn: string) => {
    if (!lpSharesIn || parseFloat(lpSharesIn) <= 0) return '0';
    if (totalLp === 0n) return '0';
    const usdcValue = (parseFloat(lpSharesIn) * 1e6 * Number(totalLiquidity)) / Number(totalLp);
    return (usdcValue / 1e6).toFixed(2);
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }
    setIsPending(true);
    try {
      const amountBase = String(Math.round(parseFloat(amount) * 1_000_000));
      if (mode === 'add') {
        const approveTx = await api.trade.buildApprove(market.address, amountBase);
        await sendTransactionAsync({ to: approveTx.to as `0x${string}`, data: approveTx.data as `0x${string}` });
        const addTx = await api.liquidity.buildAdd(market.address, amountBase, '');
        const hash = await sendTransactionAsync({ to: addTx.to as `0x${string}`, data: addTx.data as `0x${string}` });
        toast.success(`Liquidity added! TX: ${hash.slice(0, 10)}…`);
      } else {
        const removeTx = await api.liquidity.buildRemove(market.address, amountBase, '');
        const hash = await sendTransactionAsync({ to: removeTx.to as `0x${string}`, data: removeTx.data as `0x${string}` });
        toast.success(`Liquidity removed! TX: ${hash.slice(0, 10)}…`);
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
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="h-5 w-5 text-[#E8C547]" />
        <h2 className="text-lg font-semibold text-white">Liquidity Provider</h2>
      </div>

      {userLp > 0n && (
        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4 mb-6" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <div className="text-sm text-[#999999] mb-3">Your LP Position</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#666666] mb-1">LP Shares</div>
              <div className="text-lg font-semibold text-[#E8C547]">{formatUSDC(userLp)}</div>
            </div>
            <div>
              <div className="text-xs text-[#666666] mb-1">Pool Share</div>
              <div className="text-lg font-semibold text-[#E8C547]">{poolPercentage}%</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[rgba(212,175,55,0.2)]">
            <div className="text-xs text-[#666666] mb-1">Estimated Value</div>
            <div className="text-lg font-semibold text-white">
              ${estimateUsdcOut(formatUSDC(userLp))} USDC
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
                Pool share: {totalLp > 0n ? ((parseFloat(estimateLpShares(amount)) / Number(totalLp) * 1e6) * 100).toFixed(4) : '0.0000'}%
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
          disabled={isPending}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
        >
          {isPending ? 'Confirming…' : mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
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
