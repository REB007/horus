# Horus API — TypeScript Backend

## Product
10-minute Up/Down prediction markets on Base memecoins from **Clanker.world**.
- Pick a trending Clanker memecoin → create market on-chain (contract snapshots Uniswap V3 tick)
- After 10 min, admin calls `resolve()` → contract reads current tick from Uniswap → compares → resolves
- **Price oracle is fully on-chain** — admin triggers resolution but cannot choose the outcome
- Users bet with USDC. Winner takes all (minus 2% LP fee).

## Why TypeScript (not Go)
- Same ecosystem as the frontend (viem, ethers patterns)
- No new toolchain to learn mid-hackathon
- viem does everything go-ethereum does: ABI encoding, contract reads, tx signing
- No CGO/abigen headaches

---

## Tech Stack
- **Node.js 20+** with **TypeScript**
- **Express** — HTTP server + REST router
- **viem** — contract reads, ABI encoding, admin tx signing (same lib as frontend)
- **better-sqlite3** — zero-config embedded DB (no native compilation issues like go-sqlite3)
- **dotenv** — env config
- **node-cron** — scheduler for auto-resolver tick

---

## External APIs

### Clanker API (token discovery)
```
GET https://www.clanker.world/api/tokens?chainId=8453&includeMarket=true&sortBy=market-cap&sort=desc&limit=20
```
Returns: `{ data: [{ contract_address, name, symbol, img_url, pool_address, related.market.marketCap, ... }] }`
- Free, no auth required
- Use `sortBy=market-cap` for trending tokens, `sortBy=tx-h24` for most active
- Filter `chainId=8453` for Base only
- **`pool_address`** is the Uniswap V3 pool — we pass this to `createMarket()`

### Price Oracle — ON-CHAIN (no DexScreener needed)
Resolution uses Uniswap V3 `slot0().tick` directly in the smart contract:
```
1. Market created → contract reads slot0().tick from Uni V3 pool → stores snapshotTick
2. resolutionTime arrives (10 min later)
3. Admin backend calls resolve() on-chain
4. Contract reads slot0().tick → compares to snapshotTick
5. If price went up → yesWins = true
6. Contract sets resolved = true, emits event
```
The backend just calls `resolve()` — no price fetching, no comparison logic. The contract does all the math.

---

## Project Structure

```
api/
  src/
    index.ts                     -- Entry point: init DB, start resolver, start HTTP server
    config.ts                    -- Load env vars, export typed config
    routes/
      markets.ts                 -- Market list, detail, price endpoints
      trade.ts                   -- TX builder endpoints (buy/sell/mint/redeem)
      liquidity.ts               -- TX builder endpoints (add/remove liquidity)
      user.ts                    -- User positions, claimable
      admin.ts                   -- Create market, manual resolve
      tokens.ts                  -- Clanker token discovery proxy
    services/
      chain.ts                   -- viem clients (public + wallet), contract helpers
      resolver.ts                -- Auto-resolution: call resolve() on-chain (contract reads price)
      clanker.ts                 -- Clanker API client (getTrendingTokens, getTokenInfo)
      txbuilder.ts               -- ABI encode contract calls → return {to, data, value}
    db/
      index.ts                   -- Open SQLite, run migrations, query helpers
      migrations/
        001_init.sql             -- markets table with resolver metadata
    abi/
      PredictionMarket.json      -- ABI from forge build output
      MarketFactory.json         -- ABI from forge build output
      OutcomeToken.json          -- ABI from forge build output
  .env.example
  package.json
  tsconfig.json
```

---

## Database Schema

Only one table needed for hackathon — tracks markets + resolver metadata.
On-chain data (reserves, balances) is read live via RPC.

```sql
CREATE TABLE IF NOT EXISTS markets (
  address           TEXT PRIMARY KEY,
  token_address     TEXT NOT NULL,          -- Clanker memecoin address
  token_symbol      TEXT NOT NULL,
  token_name        TEXT NOT NULL,
  token_img         TEXT,
  pool_address      TEXT NOT NULL,          -- Uniswap V3 pool address
  question          TEXT NOT NULL,
  resolution_time   INTEGER NOT NULL,       -- Unix timestamp
  resolved          INTEGER NOT NULL DEFAULT 0,
  yes_wins          INTEGER,                -- NULL until resolved
  created_at        INTEGER NOT NULL,
  tx_hash           TEXT                    -- createMarket tx hash
);
```

**Why so minimal?**
- Price snapshot is stored **on-chain** (`snapshotTick` in PredictionMarket contract) — no need to duplicate
- Reserves, balances, prices are all read live via RPC
- We only persist market metadata for fast listing + resolver tracking

---

## REST API Endpoints

### Token Discovery (Clanker proxy)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tokens/trending` | Top 20 Clanker memecoins by market cap (cached 30s) |
| GET | `/api/tokens/:address` | Single token info from Clanker (name, symbol, img, pool_address) |

### Markets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | All markets from DB + live prices from chain |
| GET | `/api/markets/:address` | Single market detail (on-chain reads for reserves, prices) |
| GET | `/api/markets/:address/price` | YES/NO prices (calls `getYesPrice()`/`getNoPrice()` on-chain) |

### Trading (returns unsigned tx calldata)
| Method | Path | Body |
|--------|------|------|
| POST | `/api/markets/:address/buy` | `{ buyYes: boolean, amount: string, sender: string }` |
| POST | `/api/markets/:address/sell` | `{ sellYes: boolean, amount: string, sender: string }` |
| POST | `/api/markets/:address/mint` | `{ amount: string, sender: string }` |
| POST | `/api/markets/:address/redeem` | `{ amount: string, sender: string }` |
| POST | `/api/markets/:address/claim` | `{ sender: string }` |

### Liquidity
| Method | Path | Body |
|--------|------|------|
| POST | `/api/markets/:address/liquidity/add` | `{ amount: string, sender: string }` |
| POST | `/api/markets/:address/liquidity/remove` | `{ lpAmount: string, sender: string }` |

### User
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/:address/positions` | YES/NO/LP balances across all markets (batch on-chain reads) |
| GET | `/api/users/:address/claimable` | Claimable USDC on resolved markets |

### Admin
| Method | Path | Body |
|--------|------|------|
| POST | `/api/admin/markets` | `{ tokenAddress: string, initialLiquidity: string }` |
| POST | `/api/admin/markets/:address/resolve` | `{}` (manual trigger — contract reads price on-chain) |

**TX builder response shape (all POST trade/liquidity endpoints):**
```json
{
  "to": "0xMarketAddress",
  "data": "0xABI_encoded_calldata",
  "value": "0"
}
```

**Admin create market flow:**
```
1. Frontend sends { tokenAddress, initialLiquidity }
2. Backend fetches token info from Clanker API (name, symbol, img, pool_address)
3. Backend determines token0IsQuote by reading pool.token0() on-chain
4. Backend builds question: "Will $SYMBOL be UP in 10 min?"
5. Backend sets resolutionTime = now + 600 seconds
6. Backend signs + sends createMarket(question, resolutionTime, initialLiquidity, poolAddress, token0IsQuote)
   → Contract reads slot0().tick and stores snapshotTick
7. Backend inserts market row in DB
8. Returns { marketAddress, question, resolutionTime }
```

---

## Auto-Resolver (`services/resolver.ts`)

Drastically simplified — the contract handles all price logic.

```
Every 10 seconds:
  1. Query DB: SELECT * FROM markets WHERE resolved = 0 AND resolution_time <= now()
  2. For each expired market:
     a. Call resolve() on-chain via admin walletClient
        → Contract reads slot0().tick from Uniswap pool
        → Contract compares to snapshotTick
        → Contract sets resolved + yesWins
     b. Read yesWins from chain, UPDATE markets SET resolved=1, yes_wins=?
     c. Log: "$SYMBOL resolved → YES/NO"
  3. Sleep 10s
```

**Edge cases:**
- TX fails (nonce, gas) → log error, retry next tick
- Market already resolved on-chain but not in DB → read `resolved` from chain, sync DB
- Multiple markets expire at once → resolve sequentially (avoid nonce conflicts)

---

## Chain Client (`services/chain.ts`)

```typescript
// Public client for reads (anyone)
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});

// Wallet client for admin txs (signs with ADMIN_PRIVATE_KEY)
const walletClient = createWalletClient({
  account: privateKeyToAccount(config.adminPrivateKey),
  chain: baseSepolia,
  transport: http(config.rpcUrl),
});
```

Helper functions:
- `getMarketContract(address)` → typed contract instance for reads
- `getFactoryContract()` → factory instance
- `readMarketData(address)` → batch call: question, reserves, prices, resolved, yesWins
- `readUserPositions(userAddr, marketAddrs)` → batch balanceOf calls

---

## Environment Variables (`.env.example`)

```
RPC_URL=https://sepolia.base.org
ADMIN_PRIVATE_KEY=0x...
FACTORY_ADDRESS=0x...
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
PORT=8080
```

---

## Epics & Story Points

**1 SP ≈ 30 min of focused work.**

### Epic 1: Scaffold & Config (2 SP) — MUST DO FIRST
| ID | Task | SP | Priority |
|----|------|----|----------|
| 1.1 | `npm init`, install deps (express, viem, better-sqlite3, dotenv, cors, node-cron, tsx) | 0.5 | 🔴 |
| 1.2 | `tsconfig.json`, `src/config.ts` (load + validate env vars) | 0.5 | 🔴 |
| 1.3 | Copy ABIs from `contracts/out/` into `src/abi/` | 0.5 | 🔴 |
| 1.4 | `.env.example` + `.gitignore` | 0.5 | 🔴 |

### Epic 2: Chain Client (2 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 2.1 | `services/chain.ts` — publicClient + walletClient + contract helpers | 1 | 🔴 |
| 2.2 | `services/txbuilder.ts` — ABI encode all contract functions → `{to, data, value}` | 1 | 🔴 |

### Epic 3: External API Client (1 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 3.1 | `services/clanker.ts` — fetch trending tokens + token info, cache 30s | 1 | 🔴 |

### Epic 4: Database (1.5 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 4.1 | `db/index.ts` — open SQLite, run migration, typed query helpers | 1 | 🔴 |
| 4.2 | `db/migrations/001_init.sql` | 0.5 | 🔴 |

### Epic 5: Market Read Endpoints (2.5 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 5.1 | `GET /api/markets` — DB markets + batch on-chain reads for prices/reserves | 1.5 | 🔴 |
| 5.2 | `GET /api/markets/:address` — single market detail | 0.5 | 🔴 |
| 5.3 | `GET /api/markets/:address/price` — YES/NO prices | 0.5 | 🔴 |

### Epic 6: Token Discovery Endpoints (1 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 6.1 | `GET /api/tokens/trending` — proxy Clanker API | 0.5 | 🔴 |
| 6.2 | `GET /api/tokens/:address` — token info + DexScreener price | 0.5 | 🔴 |

### Epic 7: TX Builder Endpoints (2 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 7.1 | `POST /buy`, `/sell` — encode + return calldata | 0.5 | 🔴 |
| 7.2 | `POST /mint`, `/redeem`, `/claim` | 0.5 | 🔴 |
| 7.3 | `POST /liquidity/add`, `/liquidity/remove` | 0.5 | 🟡 |
| 7.4 | USDC approval helper: `POST /api/markets/:address/approve` | 0.5 | 🟡 |

### Epic 8: Admin Endpoints (2 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 8.1 | `POST /admin/markets` — fetch token info from Clanker, determine token0IsQuote, sign + send createMarket (contract snapshots tick), insert DB | 1.5 | 🔴 |
| 8.2 | `POST /admin/markets/:address/resolve` — manual resolve trigger (contract reads price on-chain) | 0.5 | 🔴 |

### Epic 9: Auto-Resolver (1.5 SP) — CORE FEATURE
| ID | Task | SP | Priority |
|----|------|----|----------|
| 9.1 | `services/resolver.ts` — poll loop: find expired markets, call resolve() on-chain (contract does price comparison), sync DB | 1 | 🔴 |
| 9.2 | Wire into `index.ts` startup, add logging | 0.5 | 🔴 |

### Epic 10: User Endpoints (2 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 10.1 | `GET /users/:address/positions` — batch balanceOf across all markets | 1.5 | 🟡 |
| 10.2 | `GET /users/:address/claimable` — filter resolved markets, check winning balance | 0.5 | 🟡 |

### Epic 11: Server & Wiring (1 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 11.1 | `src/index.ts` — load env, init DB, init chain, mount routes, start resolver, listen on PORT | 0.5 | 🔴 |
| 11.2 | CORS middleware, error handling, JSON helpers | 0.5 | 🔴 |

### Epic 12: Integration (2 SP)
| ID | Task | SP | Priority |
|----|------|----|----------|
| 12.1 | Wire frontend to backend, verify all endpoint shapes match `front/lib/api.ts` | 1 | 🔴 |
| 12.2 | E2E: pick token → create market → buy YES → wait 5 min → auto-resolve → claim | 1 | 🔴 |

---

## Implementation Order (Critical Path)

```
Epic 1 (scaffold) → Epic 2 (chain) → Epic 4 (DB) → Epic 3 (Clanker)
                                                        ↓
Epic 11 (server) → Epic 5 (market reads) → Epic 8 (admin create) → Epic 9 (auto-resolver)
                                                        ↓
                   Epic 7 (tx builders) → Epic 6 (tokens) → Epic 10 (user) → Epic 12 (integration)
```

**Minimum viable demo (Epics 1-5, 8-9, 11):** ~12.5 SP ≈ 6.5 hours
- Can create markets on Clanker tokens (contract snapshots Uniswap tick)
- Markets auto-resolve after 10 min (contract reads price on-chain)
- Frontend can read market data + prices

**Full hackathon build (all epics):** ~20 SP ≈ 10 hours

---

## Incremental Path to Permissionless

### v1 — Hackathon (this plan)
- Admin creates markets via admin panel
- Admin picks tokens from Clanker trending list
- Auto-resolver handles resolution
- Users trade with USDC

### v2 — Post-hackathon
- Anyone can request a market via `POST /api/markets/request { tokenAddress }`
- Backend validates token exists on Clanker, creates market with admin key
- Rate limit: 1 market per token per 5 min (prevent spam)

### v3 — Fully permissionless
- Remove `onlyAdmin` from `MarketFactory.createMarket`
- Anyone creates + funds markets directly on-chain
- Backend only handles auto-resolution
- Add staking/bonding to prevent spam markets

---

## Notes
- All `amount` fields are **raw decimal strings** (6 decimals for USDC). Frontend converts human-readable values.
- `getYesPrice()` / `getNoPrice()` return BPS (0–10000). Divide by 100 for percentage.
- LP balances are on-chain only (`lpBalances` mapping) — read live, not cached.
- CORS open (`*`) for local dev.
- **No DexScreener dependency** — price oracle is fully on-chain via Uniswap V3 `slot0().tick`.
- Clanker API has no documented rate limit but we cache for 30s to be safe.
- For hackathon: all on-chain reads use `publicClient.readContract` (no indexer needed).
- Auto-resolver is trivial: just calls `resolve()` — the contract handles all price logic.
- `token0IsQuote` must be determined at market creation by reading `pool.token0()` and checking if it's WETH.
