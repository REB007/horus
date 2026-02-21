'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/wagmi';
import { Toaster } from 'react-hot-toast';
import { useEffect, createContext, useState, useContext } from 'react';
import { initFarcasterSDK, isInMiniApp } from '@/lib/farcaster';

const queryClient = new QueryClient();

interface FarcasterContextValue {
  isMiniApp: boolean;
  farcasterUser: { fid: number; username?: string; displayName?: string } | null;
}

const FarcasterContext = createContext<FarcasterContextValue>({ isMiniApp: false, farcasterUser: null });
export const useFarcaster = () => useContext(FarcasterContext);

const customTheme = darkTheme({
  accentColor: '#D4AF37',
  accentColorForeground: '#0a0a0a',
  borderRadius: 'medium',
  fontStack: 'system',
});

customTheme.colors.modalBackground = '#1a1a1a';
customTheme.colors.modalBorder = 'rgba(212, 175, 55, 0.4)';
customTheme.colors.modalText = '#ffffff';
customTheme.colors.modalTextSecondary = '#999999';
customTheme.colors.profileForeground = '#1a1a1a';
customTheme.colors.selectedOptionBorder = 'rgba(212, 175, 55, 0.6)';
customTheme.shadows.dialog = '4px 4px 0px rgba(212, 175, 55, 0.6)';
customTheme.shadows.profileDetailsAction = '2px 2px 0px rgba(212, 175, 55, 0.4)';
customTheme.shadows.selectedOption = '3px 3px 0px rgba(212, 175, 55, 0.5)';
customTheme.shadows.selectedWallet = '3px 3px 0px rgba(212, 175, 55, 0.5)';
customTheme.shadows.walletLogo = '2px 2px 0px rgba(212, 175, 55, 0.3)';

export function Providers({ children }: { children: React.ReactNode }) {
  const [fcState, setFcState] = useState<FarcasterContextValue>({
    isMiniApp: false,
    farcasterUser: null,
  });

  useEffect(() => {
    if (!isInMiniApp()) return;

    setFcState((prev) => ({ ...prev, isMiniApp: true }));

    initFarcasterSDK().then((ctx) => {
      if (ctx?.user) {
        setFcState({
          isMiniApp: true,
          farcasterUser: {
            fid: ctx.user.fid,
            username: ctx.user.username,
            displayName: ctx.user.displayName ?? undefined,
          },
        });
      }
    });
  }, []);

  return (
    <FarcasterContext.Provider value={fcState}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={customTheme} showRecentTransactions={true}>
            {children}
            <Toaster position="bottom-right" />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </FarcasterContext.Provider>
  );
}
