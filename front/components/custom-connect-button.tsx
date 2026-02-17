'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { contracts } from '@/lib/config';

export function CustomConnectButton() {
  const { address } = useAccount();

  // Read USDC balance
  const { data: usdcBalance } = useReadContract({
    address: contracts.usdc,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="px-4 py-2 bg-gradient-to-br from-[#D4AF37] to-[#E8C547] text-[#0a0a0a] font-semibold rounded-lg transition-all border-2 border-[#0a0a0a] neo-hover neo-active"
                    style={{ boxShadow: '3px 3px 0px #0a0a0a' }}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-4 py-2 bg-[#F87171] text-white font-semibold rounded-lg transition-all border-2 border-[rgba(248,113,113,0.6)] neo-hover neo-active"
                    style={{ boxShadow: '3px 3px 0px rgba(248, 113, 113, 0.5)' }}
                  >
                    Wrong network
                  </button>
                );
              }

              const formattedBalance = usdcBalance
                ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2)
                : '0.00';

              return (
                <div className="flex gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-3 py-2 bg-[#1a1a1a] border-2 border-[rgba(212,175,55,0.4)] text-white rounded-lg transition-all neo-hover neo-active flex items-center gap-2"
                    style={{ boxShadow: '2px 2px 0px rgba(212, 175, 55, 0.4)' }}
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="px-4 py-2 bg-[#1a1a1a] border-2 border-[rgba(212,175,55,0.4)] text-white rounded-lg transition-all neo-hover neo-active"
                    style={{ boxShadow: '3px 3px 0px rgba(212, 175, 55, 0.4)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#E8C547] font-semibold">{formattedBalance} USDC</span>
                      <span className="text-[#999999]">•</span>
                      <span className="font-medium">{account.displayName}</span>
                    </div>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
