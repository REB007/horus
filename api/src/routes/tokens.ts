import { Router, Request, Response } from 'express';
import { getTrendingTokens, getTokenByAddress } from '../services/clanker';

const router = Router();

router.get('/trending', async (_req: Request, res: Response) => {
  try {
    const tokens = await getTrendingTokens();
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get('/:address', async (req: Request, res: Response) => {
  try {
    const token = await getTokenByAddress(req.params.address);
    if (!token) return res.status(404).json({ error: 'Token not found' });
    res.json(token);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
