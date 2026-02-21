import { publicClient, walletClient, adminAccount } from './chain';
import { getUnresolvedExpired, markResolved } from '../db';
import PredictionMarketV3Abi from '../abi/PredictionMarketV3.json';
import { getUniswapPrice } from './uniswap';

let running = false;

export async function runResolverTick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const expired = getUnresolvedExpired();
    for (const market of expired) {
      await resolveMarket(market.address, market.token_symbol);
    }
  } finally {
    running = false;
  }
}

async function resolveMarket(address: string, symbol: string): Promise<void> {
  try {
    const addr = address as `0x${string}`;

    // Check if already resolved on-chain (could have been resolved manually)
    const onChainResolved = await publicClient.readContract({
      address: addr,
      abi: PredictionMarketV3Abi,
      functionName: 'resolved',
    }) as boolean;

    if (onChainResolved) {
      const yesWins = await publicClient.readContract({
        address: addr,
        abi: PredictionMarketV3Abi,
        functionName: 'yesWins',
      }) as boolean;
      markResolved(address, yesWins);
      console.log(`[resolver] $${symbol} already resolved on-chain → synced DB (${yesWins ? 'YES' : 'NO'})`);
      return;
    }

    // Read oracle metadata from contract to know which token/chain to price
    const [sourceChainId, sourceToken] = await Promise.all([
      publicClient.readContract({ address: addr, abi: PredictionMarketV3Abi, functionName: 'sourceChainId' }),
      publicClient.readContract({ address: addr, abi: PredictionMarketV3Abi, functionName: 'sourceToken' }),
    ]);

    // Fetch current price from Uniswap API
    const resolutionPrice = await getUniswapPrice(
      Number(sourceChainId as bigint),
      sourceToken as string,
    );
    console.log(`[resolver] $${symbol} fetched price: ${resolutionPrice}`);

    // Call resolve(int256 _resolutionPrice)
    const hash = await walletClient.writeContract({
      account: adminAccount,
      address: addr,
      abi: PredictionMarketV3Abi,
      functionName: 'resolve',
      args: [resolutionPrice],
    });

    console.log(`[resolver] $${symbol} resolve(${resolutionPrice}) sent: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });

    // Read outcome from chain
    const yesWins = await publicClient.readContract({
      address: addr,
      abi: PredictionMarketV3Abi,
      functionName: 'yesWins',
    }) as boolean;

    markResolved(address, yesWins);
    console.log(`[resolver] $${symbol} resolved → ${yesWins ? 'YES' : 'NO'} wins`);
  } catch (err) {
    console.error(`[resolver] $${symbol} (${address}) failed:`, err);
  }
}
