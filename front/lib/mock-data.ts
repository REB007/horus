import type { Market } from '@/types/market';

export const mockMarkets: Market[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    question: 'Will ETH reach $3,000 by March 1, 2026?',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 12,
    resolved: false,
    yesReserve: '670000000',
    noReserve: '330000000',
    totalVolume: '2500000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 3,
  },
  {
    address: '0x2345678901234567890123456789012345678901',
    question: 'Will Bitcoin hit $100k before April 2026?',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 45,
    resolved: false,
    yesReserve: '820000000',
    noReserve: '180000000',
    totalVolume: '5200000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 7,
  },
  {
    address: '0x3456789012345678901234567890123456789012',
    question: 'Will Base TVL exceed $10B by end of Q1 2026?',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 30,
    resolved: false,
    yesReserve: '450000000',
    noReserve: '550000000',
    totalVolume: '1800000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
  },
  {
    address: '0x4567890123456789012345678901234567890123',
    question: 'Will the Fed cut rates in March 2026?',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 20,
    resolved: false,
    yesReserve: '300000000',
    noReserve: '700000000',
    totalVolume: '3100000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 5,
  },
  {
    address: '0x5678901234567890123456789012345678901234',
    question: 'Will ETHDenver 2026 have over 10,000 attendees?',
    resolutionTime: Math.floor(Date.now() / 1000) - 86400 * 2,
    resolved: true,
    yesWins: true,
    yesReserve: '920000000',
    noReserve: '80000000',
    totalVolume: '4500000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 30,
  },
  {
    address: '0x6789012345678901234567890123456789012345',
    question: 'Will Solana outperform Ethereum in Q1 2026?',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 60,
    resolved: false,
    yesReserve: '550000000',
    noReserve: '450000000',
    totalVolume: '2200000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 1,
  },
  {
    address: '0x7890123456789012345678901234567890123456',
    question: 'Will a new L2 launch on Ethereum in February 2026?',
    resolutionTime: Math.floor(Date.now() / 1000) - 86400 * 5,
    resolved: true,
    yesWins: false,
    yesReserve: '200000000',
    noReserve: '800000000',
    totalVolume: '1500000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 40,
  },
  {
    address: '0x8901234567890123456789012345678901234567',
    question: 'Will gas fees on Base stay under $0.01 in February?',
    resolutionTime: Math.floor(Date.now() / 1000) + 86400 * 8,
    resolved: false,
    yesReserve: '880000000',
    noReserve: '120000000',
    totalVolume: '980000000',
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 4,
  },
];

export function calculateYesPrice(yesReserve: string, noReserve: string): number {
  const yes = parseFloat(yesReserve);
  const no = parseFloat(noReserve);
  return no / (yes + no);
}

export function calculateNoPrice(yesReserve: string, noReserve: string): number {
  const yes = parseFloat(yesReserve);
  const no = parseFloat(noReserve);
  return yes / (yes + no);
}
