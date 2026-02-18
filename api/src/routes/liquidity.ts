import { Router, Request, Response } from 'express';
import { buildAddLiquidity, buildRemoveLiquidity } from '../services/txbuilder';

const router = Router({ mergeParams: true });

router.post('/add', (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    res.json(buildAddLiquidity(req.params.address, BigInt(amount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/remove', (req: Request, res: Response) => {
  try {
    const { lpAmount } = req.body;
    if (!lpAmount) return res.status(400).json({ error: 'lpAmount required' });
    res.json(buildRemoveLiquidity(req.params.address, BigInt(lpAmount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
