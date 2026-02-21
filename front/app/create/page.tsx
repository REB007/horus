'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Plus, Zap, Search, ExternalLink, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatPrice18 } from '@/lib/utils';
import type { ClankerToken } from '@/types/market';
import toast from 'react-hot-toast';

export default function CreatePage() {
  const { isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<ClankerToken | null>(null);
  const [initialLiquidity, setInitialLiquidity] = useState('10');
  const [tokenSearch, setTokenSearch] = useState('');
  const [trendingTokens, setTrendingTokens] = useState<ClankerToken[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState('');
  const [result, setResult] = useState<{ marketAddress: string; question: string; snapshotPrice: string; txHash: string } | null>(null);
  const [priceCheck, setPriceCheck] = useState<{ loading: boolean; priceUsd: string | null; error: string | null }>({ loading: false, priceUsd: null, error: null });
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    setTokensLoading(true);
    api.tokens.trending()
      .then(setTrendingTokens)
      .catch(() => {})
      .finally(() => setTokensLoading(false));
  }, []);

  const handleSelectToken = async (token: ClankerToken) => {
    setSelectedToken(token);
    setPriceCheck({ loading: true, priceUsd: null, error: null });
    try {
      const res = await api.admin.priceCheck(8453, token.contract_address);
      setPriceCheck({ loading: false, priceUsd: res.priceUsd, error: null });
    } catch {
      setPriceCheck({ loading: false, priceUsd: null, error: 'No Uniswap price available for this token' });
    }
  };

  const filteredTokens = trendingTokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) ||
      t.name.toLowerCase().includes(tokenSearch.toLowerCase())
  );

  const handleCreate = async () => {
    if (!selectedToken) { toast.error('Select a token first'); return; }
    const liq = parseFloat(initialLiquidity);
    if (!liq || liq < 10) { toast.error('Minimum liquidity is 10 USDC'); return; }

    setIsCreating(true);
    setResult(null);
    setCreationStep('Fetching price from Uniswap…');
    try {
      // Simulate step updates (the API does all steps server-side)
      const stepTimer1 = setTimeout(() => setCreationStep('Approving USDC spend…'), 5000);
      const stepTimer2 = setTimeout(() => setCreationStep('Sending createMarket transaction…'), 12000);
      const stepTimer3 = setTimeout(() => setCreationStep('Waiting for confirmation…'), 18000);

      const res = await api.admin.createMarket({
        tokenAddress: selectedToken.contract_address,
        tokenSymbol: selectedToken.symbol,
        tokenName: selectedToken.name,
        initialLiquidity: Math.round(liq * 1_000_000),
        sourceChainId: 8453,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setResult(res);
      toast.success(`Market created for $${selectedToken.symbol}!`, { duration: 5000 });
    } catch (e) {
      toast.error(`Failed: ${e}`);
    } finally {
      setIsCreating(false);
      setCreationStep('');
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <Plus className="h-16 w-16 text-[#E8C547] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Create a Market</h1>
          <p className="text-[#999999] mb-8">Connect your wallet to create a prediction market</p>
          <div className="flex justify-center"><ConnectButton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>Create Market</h1>
        <p className="text-[#999999]">Pick a token and seed liquidity — anyone can create a 10-minute prediction market</p>
      </div>

      {/* Success result */}
      {result && (
        <div className="bg-[#1a1a1a] border-2 border-[rgba(74,222,128,0.5)] rounded-xl p-6 mb-6" style={{ boxShadow: '4px 4px 0px rgba(74, 222, 128, 0.5)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-[#4ADE80]" />
            <span className="text-[#4ADE80] font-semibold">Market Created!</span>
          </div>
          <div className="text-white font-medium mb-2">{result.question}</div>
          <div className="text-sm text-[#999999] mb-1">Snapshot Price: <span className="text-white font-mono">${formatPrice18(result.snapshotPrice)}</span></div>
          <div className="text-xs text-[#666666] font-mono mb-3 break-all">{result.marketAddress}</div>
          <Link
            href={`/market/${result.marketAddress}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg border-2 border-[#0a0a0a] neo-hover neo-active"
            style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
          >
            View Market <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
        {/* Token search */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-[#999999] mb-2">1. Pick a token</label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666666]" />
            <input
              type="text"
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
              placeholder="Search by name or symbol..."
              className="w-full pl-9 pr-4 py-2 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors placeholder-[#666666] text-sm"
              style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
            />
          </div>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {tokensLoading && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-5 w-5 text-[#E8C547] animate-spin" />
                <span className="text-[#999999] text-sm">Loading tokens…</span>
              </div>
            )}
            {!tokensLoading && filteredTokens.map((token) => (
              <button
                key={token.contract_address}
                onClick={() => handleSelectToken(token)}
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
                {token.totalValueLockedUSD ? (
                  <span className="text-[#666666] text-xs font-mono">${(token.totalValueLockedUSD / 1e6).toFixed(1)}M TVL</span>
                ) : token.market_cap ? (
                  <span className="text-[#666666] text-xs font-mono">${(token.market_cap / 1e6).toFixed(1)}M</span>
                ) : null}
              </button>
            ))}
            {!tokensLoading && filteredTokens.length === 0 && (
              <div className="text-center py-4 text-[#666666] text-sm">No tokens found</div>
            )}
          </div>
        </div>

        {/* Preview */}
        {selectedToken && (
          <div className={`bg-[#0a0a0a] border-2 rounded-lg p-3 mb-5 text-sm ${priceCheck.error ? 'border-[rgba(248,113,113,0.5)]' : 'border-[rgba(212,175,55,0.4)]'}`} style={{ boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.5)' }}>
            <div className="text-[#999999] text-xs mb-1">Market question</div>
            <div className="text-white font-medium">Will ${selectedToken.symbol} be UP in 10 min?</div>
            <div className="text-[#666666] text-xs mt-1">Resolves in 10 min · Oracle: Uniswap Price API · Chain: Base</div>
            {priceCheck.loading && (
              <div className="flex items-center gap-2 mt-2 text-[#E8C547] text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking Uniswap price…
              </div>
            )}
            {priceCheck.priceUsd && (
              <div className="mt-2 text-[#4ADE80] text-xs font-mono">Current price: ${priceCheck.priceUsd}</div>
            )}
            {priceCheck.error && (
              <div className="mt-2 text-[#F87171] text-xs">{priceCheck.error}</div>
            )}
          </div>
        )}

        {/* Liquidity */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-[#999999] mb-2">2. Initial Liquidity (USDC)</label>
          <input
            type="number"
            value={initialLiquidity}
            onChange={(e) => setInitialLiquidity(e.target.value)}
            min={10}
            placeholder="10"
            className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors placeholder-[#666666]"
            style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
          />
          <div className="text-xs text-[#666666] mt-1">Minimum: 10 USDC</div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!selectedToken || isCreating || priceCheck.loading || !!priceCheck.error}
          className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: '4px 4px 0px #0a0a0a' }}
        >
          {isCreating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {creationStep || 'Creating market…'}
            </span>
          ) : 'Create Market'}
        </button>

        {/* Creation overlay */}
        {isCreating && (
          <div className="mt-4 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.4)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 text-[#E8C547] animate-spin flex-shrink-0" />
              <span className="text-white text-sm font-medium">{creationStep}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${creationStep.includes('price') ? 'bg-[#E8C547] animate-pulse' : 'bg-[#4ADE80]'}`} />
                <span className="text-[#999999]">Fetch snapshot price</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${creationStep.includes('Approving') ? 'bg-[#E8C547] animate-pulse' : creationStep.includes('Sending') || creationStep.includes('Waiting') ? 'bg-[#4ADE80]' : 'bg-[#333333]'}`} />
                <span className="text-[#999999]">Approve USDC</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${creationStep.includes('Sending') ? 'bg-[#E8C547] animate-pulse' : creationStep.includes('Waiting') ? 'bg-[#4ADE80]' : 'bg-[#333333]'}`} />
                <span className="text-[#999999]">Send transaction</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${creationStep.includes('Waiting') ? 'bg-[#E8C547] animate-pulse' : 'bg-[#333333]'}`} />
                <span className="text-[#999999]">Wait for confirmation</span>
              </div>
            </div>
            <p className="text-[#666666] text-xs mt-3">This may take 15–30 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}
