'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Shield, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { api } from '@/lib/api';
import { formatUSDC } from '@/lib/utils';
import type { Market } from '@/types/market';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [resolvingAddr, setResolvingAddr] = useState<string | null>(null);

  useEffect(() => {
    const loadMarkets = () => api.markets.list().then(setMarkets).catch(() => {});
    loadMarkets();
    const interval = setInterval(loadMarkets, 15_000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (marketAddress: string, symbol: string) => {
    setResolvingAddr(marketAddress);
    try {
      const result = await api.admin.resolveMarket(marketAddress);
      toast.success(`$${symbol} resolved — ${result.yesWins ? 'YES' : 'NO'} wins!`, { duration: 4000 });
      const updated = await api.markets.list();
      setMarkets(updated);
    } catch (e) {
      toast.error(`Resolve failed: ${e}`);
    } finally {
      setResolvingAddr(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <Shield className="h-16 w-16 text-[#E8C547] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-[#999999] mb-8">Connect your wallet to access admin functions</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </div>
      </div>
    );
  }

  const unresolvedExpired = markets.filter(
    (m) => !m.resolved && m.resolutionTime <= Math.floor(Date.now() / 1000)
  );
  const unresolvedActive = markets.filter(
    (m) => !m.resolved && m.resolutionTime > Math.floor(Date.now() / 1000)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>Admin Panel</h1>
        <p className="text-[#999999]">Resolve markets · Monitor auto-resolver · <Link href="/create" className="text-[#E8C547] hover:underline">Create a market →</Link></p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Resolve Markets */}
        <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
          <div className="flex items-center gap-3 mb-5">
            <CheckCircle className="h-6 w-6 text-[#E8C547]" />
            <h2 className="text-xl font-semibold text-white">Resolve Markets</h2>
          </div>

          {unresolvedExpired.length === 0 && unresolvedActive.length === 0 ? (
            <div className="text-center py-12"><p className="text-[#999999]">No markets to resolve</p></div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {unresolvedExpired.length > 0 && (
                <div className="text-xs text-[#E8C547] font-medium mb-2 uppercase tracking-wider">● Ready to resolve</div>
              )}
              {unresolvedExpired.map((market) => (
                <div key={market.address} className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.5)] rounded-lg p-4" style={{ boxShadow: '3px 3px 0px rgba(212, 175, 55, 0.5)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-[#666666]">${market.tokenSymbol}</span>
                    <span className="text-white font-medium text-sm">{market.question}</span>
                  </div>
                  <div className="text-xs text-[#666666] mb-3">Liq: ${formatUSDC(BigInt(market.yesReserve) + BigInt(market.noReserve))} USDC</div>
                  <button
                    onClick={() => handleResolve(market.address, market.tokenSymbol)}
                    disabled={resolvingAddr === market.address}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg border-2 border-[#0a0a0a] neo-hover neo-active disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
                  >
                    <Zap className="h-4 w-4" />
                    {resolvingAddr === market.address ? 'Resolving…' : 'Trigger Oracle Resolution'}
                  </button>
                </div>
              ))}
              {unresolvedActive.length > 0 && (
                <div className="text-xs text-[#666666] font-medium mt-4 mb-2 uppercase tracking-wider">Active (not yet expired)</div>
              )}
              {unresolvedActive.map((market) => {
                const secsLeft = market.resolutionTime - Math.floor(Date.now() / 1000);
                const m = Math.floor(secsLeft / 60);
                const s = secsLeft % 60;
                return (
                  <div key={market.address} className="bg-[#0a0a0a] border border-[rgba(74,74,74,0.3)] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-[#666666]">${market.tokenSymbol}</span>
                      <span className="text-[#999999] text-sm ml-2">{market.question}</span>
                    </div>
                    <span className="text-[#666666] font-mono text-xs">{m}m {s}s</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Auto-resolver status */}
      <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
        <h2 className="text-xl font-semibold text-white mb-4">Auto-Resolver Status</h2>
        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <p className="text-[#666666] text-sm mb-4">
            Backend polls every 10s for expired markets and calls <span className="font-mono text-[#E8C547]">resolve(price)</span> — fetches the current price from the Uniswap Price API and submits it on-chain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[#666666] text-xs mb-1">Status</div>
              <div className="text-[#4ADE80] font-medium">● Active</div>
            </div>
            <div>
              <div className="text-[#666666] text-xs mb-1">Markets Monitored</div>
              <div className="text-white font-medium">{unresolvedActive.length + unresolvedExpired.length}</div>
            </div>
            <div>
              <div className="text-[#666666] text-xs mb-1">Poll Interval</div>
              <div className="text-white font-medium">10 seconds</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
