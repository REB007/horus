import { Router, Request, Response } from 'express';
import { buildBuy, buildSell, buildMint, buildRedeem, buildClaim, buildApprove } from '../services/txbuilder';
import { config } from '../config';

const router = Router({ mergeParams: true });

router.post('/buy', (req: Request, res: Response) => {
  try {
    const { buyYes, amount } = req.body;
    if (typeof buyYes !== 'boolean' || !amount) return res.status(400).json({ error: 'buyYes (bool) and amount required' });
    res.json(buildBuy(req.params.address, buyYes, BigInt(amount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/sell', (req: Request, res: Response) => {
  try {
    const { sellYes, amount } = req.body;
    if (typeof sellYes !== 'boolean' || !amount) return res.status(400).json({ error: 'sellYes (bool) and amount required' });
    res.json(buildSell(req.params.address, sellYes, BigInt(amount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/mint', (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    res.json(buildMint(req.params.address, BigInt(amount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/redeem', (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    res.json(buildRedeem(req.params.address, BigInt(amount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/claim', (_req: Request, res: Response) => {
  try {
    res.json(buildClaim(_req.params.address));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/approve', (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    res.json(buildApprove(config.usdcAddress, req.params.address, BigInt(amount)));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
