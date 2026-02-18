import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  adminPrivateKey: required('ADMIN_PRIVATE_KEY') as `0x${string}`,
  factoryAddress: required('FACTORY_ADDRESS') as `0x${string}`,
  usdcAddress: (process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
  wethAddress: (process.env.WETH_ADDRESS || '0x4200000000000000000000000000000000000006') as `0x${string}`,
  port: parseInt(process.env.PORT || '8080', 10),
};
