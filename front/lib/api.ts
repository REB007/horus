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

  admin: {
    createMarket: (question: string, resolutionTime: number, initialLiquidity: string) =>
      fetchAPI<{ marketAddress: string }>('/api/admin/markets', {
        method: 'POST',
        body: JSON.stringify({ question, resolutionTime, initialLiquidity }),
      }),
    resolveMarket: (address: string, yesWins: boolean) =>
      fetchAPI<void>(`/api/admin/markets/${address}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ yesWins }),
      }),
  },
};
