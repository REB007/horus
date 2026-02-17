export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'),
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
} as const;

export const contracts = {
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  factory: '' as `0x${string}`,
} as const;
