import { createPublicClient, createWalletClient, http, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config } from '../config';
import PredictionMarketV3Abi from '../abi/PredictionMarketV3.json';
import MarketFactoryV3Abi from '../abi/MarketFactoryV3.json';
import OutcomeTokenAbi from '../abi/OutcomeToken.json';

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(config.rpcUrl),
});

export const walletClient = createWalletClient({
  account: privateKeyToAccount(config.adminPrivateKey),
  chain: sepolia,
  transport: http(config.rpcUrl),
});

export const adminAccount = privateKeyToAccount(config.adminPrivateKey);

export function getMarketContract(address: `0x${string}`) {
  return getContract({
    address,
    abi: PredictionMarketV3Abi,
    client: publicClient,
  });
}

export function getFactoryContract() {
  return getContract({
    address: config.factoryAddress,
    abi: MarketFactoryV3Abi,
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
  snapshotPrice: string;
  resolutionPrice: string;
  oracleEndpoint: string;
  sourceChainId: bigint;
  sourcePool: string;
  sourceToken: string;
  yesTokenAddress: `0x${string}`;
  noTokenAddress: `0x${string}`;
}

export async function readMarketData(address: `0x${string}`): Promise<MarketOnChainData> {
  const [
    question, resolutionTime, resolved, yesWins,
    yesReserve, noReserve, yesPrice, noPrice,
    snapshotPrice, resolutionPrice,
    oracleEndpoint, sourceChainId, sourcePool, sourceToken,
    yesTokenAddress, noTokenAddress,
  ] = await Promise.all([
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'question' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'resolutionTime' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'resolved' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'yesWins' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'yesReserve' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'noReserve' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'getYesPrice' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'getNoPrice' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'snapshotPrice' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'resolutionPrice' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'oracleEndpoint' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'sourceChainId' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'sourcePool' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'sourceToken' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'yesToken' }),
    publicClient.readContract({ address, abi: PredictionMarketV3Abi, functionName: 'noToken' }),
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
    snapshotPrice: (snapshotPrice as bigint).toString(),
    resolutionPrice: (resolutionPrice as bigint).toString(),
    oracleEndpoint: oracleEndpoint as string,
    sourceChainId: sourceChainId as bigint,
    sourcePool: sourcePool as string,
    sourceToken: sourceToken as string,
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
          abi: PredictionMarketV3Abi,
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
