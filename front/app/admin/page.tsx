'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Shield, Plus, CheckCircle, Zap } from 'lucide-react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { mockMarkets, mockTrendingTokens } from '@/lib/mock-data';
import { formatUSDC } from '@/lib/utils';
import type { ClankerToken } from '@/types/market';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<ClankerToken | null>(null);
  const [initialLiquidity, setInitialLiquidity] = useState('1000');
  const [tokenSearch, setTokenSearch] = useState('');

  const filteredTokens = mockTrendingTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
      t.name.toLowerCase().includes(tokenSearch.toLowerCase())
  );

  const handleCreateMarket = () => {
    if (!selectedToken) { toast.error('Select a token first'); return; }
    if (!initialLiquidity || parseFloat(initialLiquidity) <= 0) { toast.error('Enter initial liquidity'); return; }
    toast.success(
      `Creating "Will $${selectedToken.symbol} be UP in 10 min?" with $${initialLiquidity} USDC — TX would be sent`,
      { duration: 4000 }
    );
    setSelectedToken(null);
    setInitialLiquidity('1000');
  };

  const handleResolve = (marketAddress: string, symbol: string) => {
    toast.success(`Triggering oracle resolution for $${symbol} — contract reads Uniswap V3 price — TX would be sent`, { duration: 3000 });
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

  const unresolvedExpired = mockMarkets.filter(
    (m) => !m.resolved && m.resolutionTime <= Math.floor(Date.now() / 1000)
  );
  const unresolvedActive = mockMarkets.filter(
    (m) => !m.resolved && m.resolutionTime > Math.floor(Date.now() / 1000)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>Admin Panel</h1>
        <p className="text-[#999999]">Create 10-minute memecoin markets · Oracle-resolved via Uniswap V3</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Create Market */}
        <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
          <div className="flex items-center gap-3 mb-5">
            <Plus className="h-6 w-6 text-[#E8C547]" />
            <h2 className="text-xl font-semibold text-white">New 10-min Market</h2>
          </div>

          {/* Token search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#999999] mb-2">Pick a token (Clanker trending)</label>
            <input
              type="text"
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="w-full px-4 py-2 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors placeholder-[#666666] text-sm mb-2"
              style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredTokens.map((token) => (
                <button
                  key={token.contract_address}
                  onClick={() => setSelectedToken(token)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition-all text-left ${
                    selectedToken?.contract_address === token.contract_address
                      ? 'border-[rgba(212,175,55,0.7)] bg-[rgba(212,175,55,0.1)]'
                      : 'border-[rgba(212,175,55,0.15)] bg-[#0a0a0a] hover:border-[rgba(212,175,55,0.4)]'
                  }`}
                >
                  {token.img_url ? (
                    <Image src={token.img_url} alt={token.symbol} width={28} height={28} className="rounded-full" unoptimized />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs font-bold text-[#E8C547]">{token.symbol.slice(0, 2)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-medium text-sm">${token.symbol}</span>
                    <span className="text-[#666666] text-xs ml-2">{token.name}</span>
                  </div>
                  {token.market_cap && (
                    <span className="text-[#666666] text-xs font-mono">${(token.market_cap / 1e6).toFixed(1)}M</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {selectedToken && (
            <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.4)] rounded-lg p-3 mb-4 text-sm" style={{ boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.5)' }}>
              <div className="text-[#999999] text-xs mb-1">Market question</div>
              <div className="text-white font-medium">Will ${selectedToken.symbol} be UP in 10 min?</div>
              <div className="text-[#666666] text-xs mt-1">Resolves in 10 min · Oracle: Uniswap V3 pool</div>
            </div>
          )}

          {/* Liquidity */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#999999] mb-2">Initial Liquidity (USDC)</label>
            <input
              type="number"
              value={initialLiquidity}
              onChange={(e) => setInitialLiquidity(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors placeholder-[#666666]"
              style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
            />
          </div>

          <button
            onClick={handleCreateMarket}
            disabled={!selectedToken}
            className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: '4px 4px 0px #0a0a0a' }}
          >
            Launch Market
          </button>
        </div>

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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg border-2 border-[#0a0a0a] neo-hover neo-active"
                    style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
                  >
                    <Zap className="h-4 w-4" />
                    Trigger Oracle Resolution
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
            Backend polls every 10s for expired markets and calls <span className="font-mono text-[#E8C547]">resolve()</span> — the contract reads the Uniswap V3 tick and determines the outcome on-chain.
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
