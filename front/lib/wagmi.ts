import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';
import { config } from './config';

export const wagmiConfig = getDefaultConfig({
  appName: 'Horus Prediction Market',
  projectId: config.walletConnectProjectId,
  chains: [baseSepolia, base],
  ssr: true,
});
