import { publicClient, walletClient, adminAccount } from './chain';
import { getUnresolvedExpired, markResolved } from '../db';
import PredictionMarketV2Abi from '../abi/PredictionMarketV2.json';

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
      abi: PredictionMarketV2Abi,
      functionName: 'resolved',
    }) as boolean;

    if (onChainResolved) {
      const yesWins = await publicClient.readContract({
        address: addr,
        abi: PredictionMarketV2Abi,
        functionName: 'yesWins',
      }) as boolean;
      markResolved(address, yesWins);
      console.log(`[resolver] $${symbol} already resolved on-chain → synced DB (${yesWins ? 'YES' : 'NO'})`);
      return;
    }

    // Call resolve() — contract reads Uniswap slot0().tick and decides outcome
    const hash = await walletClient.writeContract({
      account: adminAccount,
      address: addr,
      abi: PredictionMarketV2Abi,
      functionName: 'resolve',
      args: [],
    });

    console.log(`[resolver] $${symbol} resolve() sent: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });

    // Read outcome from chain
    const yesWins = await publicClient.readContract({
      address: addr,
      abi: PredictionMarketV2Abi,
      functionName: 'yesWins',
    }) as boolean;

    markResolved(address, yesWins);
    console.log(`[resolver] $${symbol} resolved → ${yesWins ? 'YES' : 'NO'} wins`);
  } catch (err) {
    console.error(`[resolver] $${symbol} (${address}) failed:`, err);
  }
}
