import { config } from './config';
import type { Market, MarketPrice, Position, ClaimableWinning, TxData } from '@/types/market';

const API_URL = config.apiUrl;

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  markets: {
    list: () => fetchAPI<Market[]>('/api/markets'),
    get: (address: string) => fetchAPI<Market>(`/api/markets/${address}`),
    getPrice: (address: string) => fetchAPI<MarketPrice>(`/api/markets/${address}/price`),
  },

  trade: {
    buildBuy: (address: string, buyYes: boolean, amount: string, sender: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/buy`, {
        method: 'POST',
        body: JSON.stringify({ buyYes, amount, sender }),
      }),
    buildSell: (address: string, sellYes: boolean, amount: string, sender: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/sell`, {
        method: 'POST',
        body: JSON.stringify({ sellYes, amount, sender }),
      }),
    buildMint: (address: string, amount: string, sender: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/mint`, {
        method: 'POST',
        body: JSON.stringify({ amount, sender }),
      }),
    buildRedeem: (address: string, amount: string, sender: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/redeem`, {
        method: 'POST',
        body: JSON.stringify({ amount, sender }),
      }),
    buildClaim: (address: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/claim`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    buildApprove: (spender: string, amount: string) =>
      fetchAPI<TxData>(`/api/markets/${spender}/approve`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
  },

  liquidity: {
    buildAdd: (address: string, amount: string, sender: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/liquidity/add`, {
        method: 'POST',
        body: JSON.stringify({ amount, sender }),
      }),
    buildRemove: (address: string, lpAmount: string, sender: string) =>
      fetchAPI<TxData>(`/api/markets/${address}/liquidity/remove`, {
        method: 'POST',
        body: JSON.stringify({ lpAmount, sender }),
      }),
  },

  user: {
    getPositions: (address: string) => fetchAPI<Position[]>(`/api/users/${address}/positions`),
    getClaimable: (address: string) => fetchAPI<ClaimableWinning[]>(`/api/users/${address}/claimable`),
  },

  tokens: {
    trending: () => fetchAPI<import('@/types/market').ClankerToken[]>('/api/tokens/trending'),
  },

  admin: {
    createMarket: (params: {
      tokenAddress: string;
      poolAddress: string;
      token0IsQuote: boolean;
      tokenSymbol?: string;
      tokenName?: string;
      initialLiquidity: number;
    }) =>
      fetchAPI<{ marketAddress: string; question: string; resolutionTime: number; txHash: string }>('/api/admin/markets', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    resolveMarket: (address: string) =>
      fetchAPI<{ yesWins: boolean; txHash: string }>(`/api/admin/markets/${address}/resolve`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
  },
};
