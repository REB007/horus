export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'),
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
} as const;

export const contracts = {
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
  factory: '0x4759219b2eb34d8645391E6Bd12B15E35b4e1866' as `0x${string}`,
} as const;
