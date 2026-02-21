import { Router, Request, Response } from 'express';
import { getMarkets } from '../db';
import { readMarketData, readUserPositions } from '../services/chain';

const router = Router();

router.get('/:address/positions', async (req: Request, res: Response) => {
  try {
    const userAddr = req.params.address as `0x${string}`;
    const rows = getMarkets();

    // Fetch yesToken/noToken addresses for all markets — skip V2 markets that lack V3 functions
    const marketMetaRaw = await Promise.all(
      rows.map(async (row) => {
        try {
          const onChain = await readMarketData(row.address as `0x${string}`);
          return {
            address: row.address,
            tokenSymbol: row.token_symbol,
            question: row.question,
            resolved: onChain.resolved,
            yesWins: onChain.yesWins,
            yesTokenAddress: onChain.yesTokenAddress,
            noTokenAddress: onChain.noTokenAddress,
          };
        } catch {
          return null;
        }
      })
    );
    const marketMeta = marketMetaRaw.filter(Boolean) as NonNullable<typeof marketMetaRaw[number]>[];

    const positions = await readUserPositions(userAddr, marketMeta);

    const result = positions
      .filter((p) => p.yesBalance > 0n || p.noBalance > 0n || p.lpBalance > 0n)
      .map((p, i) => ({
        marketAddress: p.marketAddress,
        tokenSymbol: marketMeta[i].tokenSymbol,
        question: marketMeta[i].question,
        resolved: marketMeta[i].resolved,
        yesWins: marketMeta[i].yesWins,
        yesBalance: p.yesBalance.toString(),
        noBalance: p.noBalance.toString(),
        lpBalance: p.lpBalance.toString(),
      }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/:address/claimable', async (req: Request, res: Response) => {
  try {
    const userAddr = req.params.address as `0x${string}`;
    const rows = getMarkets().filter((r) => r.resolved === 1);

    const claimable = await Promise.all(
      rows.map(async (row) => {
        try {
        const onChain = await readMarketData(row.address as `0x${string}`);
        const winningBalance = onChain.yesWins
          ? await import('../services/chain').then(({ publicClient }) =>
              publicClient.readContract({
                address: onChain.yesTokenAddress,
                abi: (require('../abi/OutcomeToken.json') as unknown[]),
                functionName: 'balanceOf',
                args: [userAddr],
              })
            )
          : await import('../services/chain').then(({ publicClient }) =>
              publicClient.readContract({
                address: onChain.noTokenAddress,
                abi: (require('../abi/OutcomeToken.json') as unknown[]),
                functionName: 'balanceOf',
                args: [userAddr],
              })
            );

        const balance = winningBalance as bigint;
        if (balance === 0n) return null;

        return {
          marketAddress: row.address,
          tokenSymbol: row.token_symbol,
          question: row.question,
          yesWins: onChain.yesWins,
          claimableAmount: balance.toString(),
        };
        } catch {
          return null;
        }
      })
    );

    res.json(claimable.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
