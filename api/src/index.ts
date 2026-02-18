import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { initDb } from './db';
import { config } from './config';
import { runResolverTick } from './services/resolver';
import marketsRouter from './routes/markets';
import tokensRouter from './routes/tokens';
import tradeRouter from './routes/trade';
import liquidityRouter from './routes/liquidity';
import userRouter from './routes/user';
import adminRouter from './routes/admin';

async function main() {
  // 1. Init DB
  initDb();
  console.log('[startup] DB initialised');

  // 2. Init Express
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 3. Mount routes
  app.use('/api/markets', marketsRouter);
  app.use('/api/markets/:address', tradeRouter);
  app.use('/api/markets/:address/liquidity', liquidityRouter);
  app.use('/api/tokens', tokensRouter);
  app.use('/api/users', userRouter);
  app.use('/api/admin', adminRouter);

  // 4. Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({ error: err.message });
  });

  // 5. Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // 6. Start auto-resolver (every 10 seconds)
  cron.schedule('*/10 * * * * *', async () => {
    try {
      await runResolverTick();
    } catch (err) {
      console.error('[resolver] tick error:', err);
    }
  });
  console.log('[startup] Auto-resolver started (every 10s)');

  // 7. Start HTTP server
  app.listen(config.port, () => {
    console.log(`[startup] Horus API listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
