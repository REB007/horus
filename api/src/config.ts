import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  rpcUrl: process.env.RPC_URL || 'https://rpc.sepolia.org',
  adminPrivateKey: required('ADMIN_PRIVATE_KEY') as `0x${string}`,
  factoryAddress: required('FACTORY_ADDRESS') as `0x${string}`,
  usdcAddress: (process.env.USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238') as `0x${string}`,
  wethAddress: (process.env.WETH_ADDRESS || '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14') as `0x${string}`,
  port: parseInt(process.env.PORT || '8080', 10),
  uniswapApiKey: process.env.UNISWAP_API_KEY || '',
  graphApiKey: process.env.GRAPH_API_KEY || '',
};
