'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Shield, Plus, CheckCircle } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { mockMarkets } from '@/lib/mock-data';
import toast from 'react-hot-toast';

const ADMIN_ADDRESS = '0x1234567890123456789012345678901234567890';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [question, setQuestion] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [initialLiquidity, setInitialLiquidity] = useState('');

  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  const handleCreateMarket = () => {
    if (!question || !resolutionDate || !resolutionTime || !initialLiquidity) {
      toast.error('Please fill in all fields');
      return;
    }

    toast.success(
      `Creating market "${question}" - Transaction would be sent to wallet`,
      { duration: 3000 }
    );

    setQuestion('');
    setResolutionDate('');
    setResolutionTime('');
    setInitialLiquidity('');
  };

  const handleResolve = (marketAddress: string, outcome: boolean) => {
    const market = mockMarkets.find((m) => m.address === marketAddress);
    toast.success(
      `Resolving "${market?.question}" as ${outcome ? 'YES' : 'NO'} - Transaction would be sent to wallet`,
      { duration: 3000 }
    );
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <Shield className="h-16 w-16 text-[#E8C547] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-[#999999] mb-8">Connect your wallet to access admin functions</p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <Shield className="h-16 w-16 text-[#F87171] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-[#999999]">
            You are not authorized to access the admin panel.
          </p>
          <p className="text-xs text-[#666666] mt-4 font-mono">
            Connected: {address}
          </p>
        </div>
      </div>
    );
  }

  const unresolvedMarkets = mockMarkets.filter((m) => !m.resolved);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)' }}>Admin Panel</h1>
        <p className="text-[#999999]">Create and manage prediction markets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
          <div className="flex items-center gap-3 mb-6">
            <Plus className="h-6 w-6 text-[#E8C547]" />
            <h2 className="text-xl font-semibold text-white">Create Market</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#999999] mb-2">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Will ETH reach $5,000 by June 2026?"
                className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors placeholder-[#666666]"
                style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#999999] mb-2">
                  Resolution Date
                </label>
                <input
                  type="date"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors"
                  style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#999999] mb-2">
                  Resolution Time
                </label>
                <input
                  type="time"
                  value={resolutionTime}
                  onChange={(e) => setResolutionTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] text-white rounded-lg focus:border-[rgba(212,175,55,0.7)] focus:outline-none transition-colors"
                  style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#999999] mb-2">
                Initial Liquidity (USDC)
              </label>
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
              className="w-full px-6 py-3 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active"
              style={{ boxShadow: '4px 4px 0px #0a0a0a' }}
            >
              Create Market
            </button>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-[#E8C547]" />
            <h2 className="text-xl font-semibold text-white">Resolve Markets</h2>
          </div>

          {unresolvedMarkets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#999999]">No markets to resolve</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {unresolvedMarkets.map((market) => {
                const isPastResolution = new Date(market.resolutionTime * 1000) < new Date();
                
                return (
                  <div
                    key={market.address}
                    className="bg-[#0a0a0a] border-2 rounded-lg p-4"
                    style={{ 
                      borderColor: isPastResolution ? 'rgba(212, 175, 55, 0.5)' : 'rgba(74, 74, 74, 0.3)',
                      boxShadow: isPastResolution ? '3px 3px 0px rgba(212, 175, 55, 0.5)' : '2px 2px 0px rgba(74, 74, 74, 0.2)'
                    }}
                  >
                    <div className="mb-3">
                      <h3 className="text-white font-medium mb-1">{market.question}</h3>
                      <p className="text-xs text-[#666666]">
                        Resolution:{' '}
                        {new Date(market.resolutionTime * 1000).toLocaleString()}
                        {isPastResolution && (
                          <span className="text-[#E8C547] ml-2 font-medium">● Ready to resolve</span>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(market.address, true)}
                        className="flex-1 px-4 py-2 bg-[#4ADE80] text-white font-medium rounded-lg transition-all border-2 border-[rgba(74,222,128,0.6)] neo-hover neo-active"
                        style={{ boxShadow: '3px 3px 0px rgba(74, 222, 128, 0.5)' }}
                      >
                        Resolve YES
                      </button>
                      <button
                        onClick={() => handleResolve(market.address, false)}
                        className="flex-1 px-4 py-2 bg-[#F87171] text-white font-medium rounded-lg transition-all border-2 border-[rgba(248,113,113,0.6)] neo-hover neo-active"
                        style={{ boxShadow: '3px 3px 0px rgba(248, 113, 113, 0.5)' }}
                      >
                        Resolve NO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-[#1a1a1a] border border-[rgba(212,175,55,0.4)] rounded-xl p-6" style={{ boxShadow: '4px 4px 0px rgba(212, 175, 55, 0.6)' }}>
        <h2 className="text-xl font-semibold text-white mb-4">Auto-Resolver Status</h2>
        <div className="bg-[#0a0a0a] border-2 border-[rgba(212,175,55,0.3)] rounded-lg p-4" style={{ boxShadow: 'inset 2px 2px 0px rgba(0, 0, 0, 0.5)' }}>
          <p className="text-gray-400 text-sm">
            Auto-resolver service monitors markets and automatically resolves them based on
            configured external data sources (APIs, oracles, etc.)
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs mb-1">Status</div>
              <div className="text-green-400 font-medium">● Active</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Markets Monitored</div>
              <div className="text-gray-100 font-medium">3</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1">Next Check</div>
              <div className="text-gray-100 font-medium">5 minutes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
