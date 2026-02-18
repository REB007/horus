import { createPublicClient, createWalletClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config';
import PredictionMarketV2Abi from '../abi/PredictionMarketV2.json';
import MarketFactoryV2Abi from '../abi/MarketFactoryV2.json';
import OutcomeTokenAbi from '../abi/OutcomeToken.json';

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

export const walletClient = createWalletClient({
  account: privateKeyToAccount(config.adminPrivateKey),
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

export const adminAccount = privateKeyToAccount(config.adminPrivateKey);

export function getMarketContract(address: `0x${string}`) {
  return getContract({
    address,
    abi: PredictionMarketV2Abi,
    client: publicClient,
  });
}

export function getFactoryContract() {
  return getContract({
    address: config.factoryAddress,
    abi: MarketFactoryV2Abi,
    client: publicClient,
  });
}

export function getTokenContract(address: `0x${string}`) {
  return getContract({
    address,
    abi: OutcomeTokenAbi,
    client: publicClient,
  });
}

export interface MarketOnChainData {
  question: string;
  resolutionTime: bigint;
  resolved: boolean;
  yesWins: boolean;
  yesReserve: bigint;
  noReserve: bigint;
  yesPrice: bigint;
  noPrice: bigint;
  snapshotTick: number;
  currentTick: number;
  yesTokenAddress: `0x${string}`;
  noTokenAddress: `0x${string}`;
}

export async function readMarketData(address: `0x${string}`): Promise<MarketOnChainData> {
  const [
    question, resolutionTime, resolved, yesWins,
    yesReserve, noReserve, yesPrice, noPrice,
    snapshotTick, currentTick, yesTokenAddress, noTokenAddress,
  ] = await Promise.all([
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'question' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'resolutionTime' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'resolved' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'yesWins' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'yesReserve' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'noReserve' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'getYesPrice' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'getNoPrice' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'snapshotTick' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'getCurrentTick' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'yesToken' }),
    publicClient.readContract({ address, abi: PredictionMarketV2Abi, functionName: 'noToken' }),
  ]);

  return {
    question: question as string,
    resolutionTime: resolutionTime as bigint,
    resolved: resolved as boolean,
    yesWins: yesWins as boolean,
    yesReserve: yesReserve as bigint,
    noReserve: noReserve as bigint,
    yesPrice: yesPrice as bigint,
    noPrice: noPrice as bigint,
    snapshotTick: snapshotTick as number,
    currentTick: currentTick as number,
    yesTokenAddress: yesTokenAddress as `0x${string}`,
    noTokenAddress: noTokenAddress as `0x${string}`,
  };
}

export async function readUserPositions(
  userAddr: `0x${string}`,
  markets: Array<{ address: string; yesTokenAddress: string; noTokenAddress: string }>
) {
  return Promise.all(
    markets.map(async (m) => {
      const [yesBalance, noBalance, lpBalance] = await Promise.all([
        publicClient.readContract({
          address: m.yesTokenAddress as `0x${string}`,
          abi: OutcomeTokenAbi,
          functionName: 'balanceOf',
          args: [userAddr],
        }),
        publicClient.readContract({
          address: m.noTokenAddress as `0x${string}`,
          abi: OutcomeTokenAbi,
          functionName: 'balanceOf',
          args: [userAddr],
        }),
        publicClient.readContract({
          address: m.address as `0x${string}`,
          abi: PredictionMarketV2Abi,
          functionName: 'lpBalances',
          args: [userAddr],
        }),
      ]);
      return {
        marketAddress: m.address,
        yesBalance: yesBalance as bigint,
        noBalance: noBalance as bigint,
        lpBalance: lpBalance as bigint,
      };
    })
  );
}

// Minimal IUniswapV3Pool ABI for token0 read
const uniV3PoolAbi = [
  { name: 'token0', type: 'function', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view' },
] as const;

export async function getPoolToken0(poolAddress: `0x${string}`): Promise<`0x${string}`> {
  return publicClient.readContract({
    address: poolAddress,
    abi: uniV3PoolAbi,
    functionName: 'token0',
  }) as Promise<`0x${string}`>;
}
