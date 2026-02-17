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
          <Shield className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Admin Panel</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to access admin functions</p>
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
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Access Denied</h1>
          <p className="text-gray-400">
            You are not authorized to access the admin panel.
          </p>
          <p className="text-xs text-gray-600 mt-4 font-mono">
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
        <h1 className="text-4xl font-bold mb-2 text-yellow-500">Admin Panel</h1>
        <p className="text-gray-400">Create and manage prediction markets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Plus className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-100">Create Market</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Will ETH reach $5,000 by June 2026?"
                className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Resolution Date
                </label>
                <input
                  type="date"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Resolution Time
                </label>
                <input
                  type="time"
                  value={resolutionTime}
                  onChange={(e) => setResolutionTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Initial Liquidity (USDC)
              </label>
              <input
                type="number"
                value={initialLiquidity}
                onChange={(e) => setInitialLiquidity(e.target.value)}
                placeholder="1000"
                className="w-full px-4 py-3 bg-gray-900 border-2 border-yellow-600/40 text-gray-100 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <button
              onClick={handleCreateMarket}
              className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition-colors border-2 border-yellow-500"
            >
              Create Market
            </button>
          </div>
        </div>

        <div className="bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-100">Resolve Markets</h2>
          </div>

          {unresolvedMarkets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No markets to resolve</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {unresolvedMarkets.map((market) => {
                const isPastResolution = new Date(market.resolutionTime * 1000) < new Date();
                
                return (
                  <div
                    key={market.address}
                    className={`bg-gray-900 border rounded-lg p-4 ${
                      isPastResolution ? 'border-yellow-600/40' : 'border-gray-700'
                    }`}
                  >
                    <div className="mb-3">
                      <h3 className="text-gray-100 font-medium mb-1">{market.question}</h3>
                      <p className="text-xs text-gray-500">
                        Resolution:{' '}
                        {new Date(market.resolutionTime * 1000).toLocaleString()}
                        {isPastResolution && (
                          <span className="text-yellow-500 ml-2">● Ready to resolve</span>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(market.address, true)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
                      >
                        Resolve YES
                      </button>
                      <button
                        onClick={() => handleResolve(market.address, false)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
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

      <div className="mt-6 bg-gray-800 border-2 border-yellow-600/40 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Auto-Resolver Status</h2>
        <div className="bg-gray-900 border border-yellow-600/20 rounded-lg p-4">
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
