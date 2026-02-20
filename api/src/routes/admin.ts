import { Router, Request, Response } from 'express';
import { parseEventLogs } from 'viem';
import { publicClient, walletClient, adminAccount, getPoolToken0 } from '../services/chain';
import { getTokenByAddress } from '../services/clanker';
import { insertMarket, getMarket, markResolved } from '../db';
import { config } from '../config';
import MarketFactoryV2Abi from '../abi/MarketFactoryV2.json';
import PredictionMarketV2Abi from '../abi/PredictionMarketV2.json';

const router = Router();

router.post('/markets', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, initialLiquidity, poolAddress, token0IsQuote: manualToken0IsQuote, tokenSymbol, tokenName } = req.body;
    if (!tokenAddress || !initialLiquidity) {
      return res.status(400).json({ error: 'tokenAddress and initialLiquidity required' });
    }

    let resolvedPoolAddress: string;
    let resolvedToken0IsQuote: boolean;
    let resolvedSymbol: string;
    let resolvedName: string;
    let resolvedImg: string | null = null;

    if (poolAddress) {
      // Manual override — bypass Clanker (used for mock tokens / testing)
      if (typeof manualToken0IsQuote !== 'boolean') {
        return res.status(400).json({ error: 'token0IsQuote (boolean) required when poolAddress is provided' });
      }
      resolvedPoolAddress = poolAddress;
      resolvedToken0IsQuote = manualToken0IsQuote;
      resolvedSymbol = tokenSymbol || 'MOCK';
      resolvedName = tokenName || 'Mock Token';
    } else {
      // Fetch token info from Clanker
      const token = await getTokenByAddress(tokenAddress);
      if (!token) return res.status(404).json({ error: 'Token not found on Clanker' });
      if (!token.pool_address) return res.status(400).json({ error: 'Token has no Uniswap pool' });

      // Determine token0IsQuote by reading pool.token0() on-chain
      const token0 = await getPoolToken0(token.pool_address as `0x${string}`);
      resolvedPoolAddress = token.pool_address;
      resolvedToken0IsQuote = token0.toLowerCase() !== tokenAddress.toLowerCase();
      resolvedSymbol = token.symbol;
      resolvedName = token.name;
      resolvedImg = token.img_url;
    }

    // Build market params
    const question = `Will $${resolvedSymbol} be UP in 10 min?`;
    const resolutionTime = BigInt(Math.floor(Date.now() / 1000) + 600);
    const liquidityBigInt = BigInt(initialLiquidity);

    // Sign + send createMarket tx
    const hash = await walletClient.writeContract({
      account: adminAccount,
      address: config.factoryAddress,
      abi: MarketFactoryV2Abi,
      functionName: 'createMarket',
      args: [question, resolutionTime, liquidityBigInt, resolvedPoolAddress as `0x${string}`, resolvedToken0IsQuote],
    });

    // Wait for receipt and extract market address from MarketCreated event
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const logs = parseEventLogs({
      abi: MarketFactoryV2Abi,
      logs: receipt.logs,
      eventName: 'MarketCreated',
    });

    if (!logs.length) return res.status(500).json({ error: 'MarketCreated event not found in receipt' });
    const marketAddress = (logs[0] as unknown as { args: { market: string } }).args.market;

    // Insert into DB
    insertMarket({
      address: marketAddress,
      token_address: tokenAddress,
      token_symbol: resolvedSymbol,
      token_name: resolvedName,
      token_img: resolvedImg,
      pool_address: resolvedPoolAddress,
      question,
      resolution_time: Number(resolutionTime),
      created_at: Math.floor(Date.now() / 1000),
      tx_hash: hash,
    });

    res.json({ marketAddress, question, resolutionTime: Number(resolutionTime), txHash: hash });
  } catch (err) {
    console.error('[admin] createMarket error:', err);
    res.status(500).json({ error: String(err) });
  }
});

router.post('/markets/:address/resolve', async (req: Request, res: Response) => {
  try {
    const addr = req.params.address as `0x${string}`;
    const row = getMarket(addr);
    if (!row) return res.status(404).json({ error: 'Market not found in DB' });

    const hash = await walletClient.writeContract({
      account: adminAccount,
      address: addr,
      abi: PredictionMarketV2Abi,
      functionName: 'resolve',
      args: [],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    const yesWins = await publicClient.readContract({
      address: addr,
      abi: PredictionMarketV2Abi,
      functionName: 'yesWins',
    }) as boolean;

    markResolved(addr, yesWins);
    res.json({ marketAddress: addr, yesWins, txHash: hash });
  } catch (err) {
    console.error('[admin] resolve error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
