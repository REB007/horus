import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { config } from './config';

export const wagmiConfig = getDefaultConfig({
  appName: 'Horus Prediction Market',
  projectId: config.walletConnectProjectId,
  chains: [sepolia],
  ssr: true,
});
