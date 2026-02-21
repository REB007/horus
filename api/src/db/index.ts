import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export interface MarketRow {
  address: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_img: string | null;
  pool_address: string;
  question: string;
  resolution_time: number;
  resolved: number;
  yes_wins: number | null;
  created_at: number;
  tx_hash: string | null;
  source_chain_id: number | null;
  source_pool: string | null;
  source_token: string | null;
  oracle_endpoint: string | null;
  snapshot_price: string | null;
}

let db: Database.Database;

export function initDb(dbPath = './horus.db'): void {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const migration = fs.readFileSync(
    path.join(__dirname, 'migrations', '001_init.sql'),
    'utf8'
  );
  db.exec(migration);

  // V3 migration — add oracle metadata columns (safe to re-run)
  const m002 = fs.readFileSync(
    path.join(__dirname, 'migrations', '002_v3_columns.sql'),
    'utf8'
  );
  for (const stmt of m002.split(';').map(s => s.trim()).filter(Boolean)) {
    try { db.exec(stmt); } catch { /* column already exists */ }
  }
}

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialised — call initDb() first');
  return db;
}

export function insertMarket(market: Omit<MarketRow, 'resolved' | 'yes_wins'>): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO markets
      (address, token_address, token_symbol, token_name, token_img, pool_address,
       question, resolution_time, resolved, yes_wins, created_at, tx_hash,
       source_chain_id, source_pool, source_token, oracle_endpoint, snapshot_price)
    VALUES
      (@address, @token_address, @token_symbol, @token_name, @token_img, @pool_address,
       @question, @resolution_time, 0, NULL, @created_at, @tx_hash,
       @source_chain_id, @source_pool, @source_token, @oracle_endpoint, @snapshot_price)
  `).run(market);
}

export function getMarkets(): MarketRow[] {
  return getDb().prepare('SELECT * FROM markets ORDER BY created_at DESC').all() as MarketRow[];
}

export function getMarket(address: string): MarketRow | undefined {
  return getDb().prepare('SELECT * FROM markets WHERE address = ?').get(address) as MarketRow | undefined;
}

export function getUnresolvedExpired(): MarketRow[] {
  const now = Math.floor(Date.now() / 1000);
  return getDb().prepare(
    'SELECT * FROM markets WHERE resolved = 0 AND resolution_time <= ?'
  ).all(now) as MarketRow[];
}

export function markResolved(address: string, yesWins: boolean): void {
  getDb().prepare(
    'UPDATE markets SET resolved = 1, yes_wins = ? WHERE address = ?'
  ).run(yesWins ? 1 : 0, address);
}
