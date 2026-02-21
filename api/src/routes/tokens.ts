import { Router, Request, Response } from 'express';
import { getTopTokens, getTokenByAddressSubgraph } from '../services/subgraph';

const router = Router();

router.get('/trending', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId ? Number(req.query.chainId) : 8453;
    const tokens = await getTopTokens(chainId);
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/:address', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId ? Number(req.query.chainId) : 8453;
    const token = await getTokenByAddressSubgraph(req.params.address, chainId);
    if (!token) return res.status(404).json({ error: 'Token not found' });
    res.json(token);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
