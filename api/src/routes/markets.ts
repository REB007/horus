import { Router, Request, Response } from 'express';
import { getMarkets, getMarket } from '../db';
import { readMarketData, publicClient } from '../services/chain';
import PredictionMarketV2Abi from '../abi/PredictionMarketV2.json';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = getMarkets();
    const markets = await Promise.all(
      rows.map(async (row) => {
        try {
          const onChain = await readMarketData(row.address as `0x${string}`);
          return {
            address: row.address,
            tokenAddress: row.token_address,
            tokenSymbol: row.token_symbol,
            tokenName: row.token_name,
            tokenImg: row.token_img,
            poolAddress: row.pool_address,
            question: row.question,
            resolutionTime: row.resolution_time,
            resolved: onChain.resolved,
            yesWins: onChain.yesWins,
            yesReserve: onChain.yesReserve.toString(),
            noReserve: onChain.noReserve.toString(),
            yesPrice: onChain.yesPrice.toString(),
            noPrice: onChain.noPrice.toString(),
            snapshotTick: onChain.snapshotTick,
            currentTick: onChain.currentTick,
            createdAt: row.created_at,
            txHash: row.tx_hash,
          };
        } catch {
          return {
            address: row.address,
            tokenAddress: row.token_address,
            tokenSymbol: row.token_symbol,
            tokenName: row.token_name,
            tokenImg: row.token_img,
            poolAddress: row.pool_address,
            question: row.question,
            resolutionTime: row.resolution_time,
            resolved: row.resolved === 1,
            yesWins: row.yes_wins === 1,
            createdAt: row.created_at,
            txHash: row.tx_hash,
          };
        }
      })
    );
    res.json(markets);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/:address', async (req: Request, res: Response) => {
  try {
    const row = getMarket(req.params.address);
    if (!row) return res.status(404).json({ error: 'Market not found' });

    const onChain = await readMarketData(row.address as `0x${string}`);
    res.json({
      address: row.address,
      tokenAddress: row.token_address,
      tokenSymbol: row.token_symbol,
      tokenName: row.token_name,
      tokenImg: row.token_img,
      poolAddress: row.pool_address,
      question: row.question,
      resolutionTime: row.resolution_time,
      resolved: onChain.resolved,
      yesWins: onChain.yesWins,
      yesReserve: onChain.yesReserve.toString(),
      noReserve: onChain.noReserve.toString(),
      yesPrice: onChain.yesPrice.toString(),
      noPrice: onChain.noPrice.toString(),
      snapshotTick: onChain.snapshotTick,
      currentTick: onChain.currentTick,
      yesTokenAddress: onChain.yesTokenAddress,
      noTokenAddress: onChain.noTokenAddress,
      createdAt: row.created_at,
      txHash: row.tx_hash,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/:address/price', async (req: Request, res: Response) => {
  try {
    const addr = req.params.address as `0x${string}`;
    const [yesPrice, noPrice] = await Promise.all([
      publicClient.readContract({ address: addr, abi: PredictionMarketV2Abi, functionName: 'getYesPrice' }),
      publicClient.readContract({ address: addr, abi: PredictionMarketV2Abi, functionName: 'getNoPrice' }),
    ]);
    res.json({ yesPrice: (yesPrice as bigint).toString(), noPrice: (noPrice as bigint).toString() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
