export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'),
  // Placeholder ID for builds - get your own at https://cloud.walletconnect.com
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a01e2f3b4c5d6e7f8g9h0i1j2k3l4m5n',
} as const;

export const contracts = {
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
  factory: '0x4759219b2eb34d8645391E6Bd12B15E35b4e1866' as `0x${string}`,
} as const;
