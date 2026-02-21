# Horus API V3 — Upgrade Plan

> **Scope:** Wire API to V3 contracts. Uniswap API for price. No dead V2 code paths.

---

## TL;DR — What Changes

| What | V2 | V3 |
|------|----|----|
| **ABIs** | `PredictionMarketV2.json`, `MarketFactoryV2.json` | `PredictionMarketV3.json`, `MarketFactoryV3.json` |
| **createMarket** | Admin-only, passes `poolAddress` + `token0IsQuote` | Anyone (via API), passes oracle metadata + `snapshotPrice` from Uniswap API |
| **resolve** | `resolve()` — no args, contract reads tick | `resolve(int256)` — API fetches price from Uniswap API, submits to contract |
| **readMarketData** | Reads `snapshotTick`, `getCurrentTick()` | Reads `snapshotPrice`, `resolutionPrice`, oracle metadata |
| **Price source** | On-chain `slot0().tick` | Uniswap Developer API (`/v2/quote`) |
| **Config** | `FACTORY_ADDRESS` (V2) | `FACTORY_ADDRESS` (V3), `UNISWAP_API_KEY` |
| **DB schema** | `pool_address` column | Add `source_chain_id`, `source_pool`, `source_token`, `oracle_endpoint`, `snapshot_price` |

---

## Detailed Changes

### 1. ABIs — Copy from `contracts/out/`

Copy V3 ABIs into `api/src/abi/`:
- `PredictionMarketV3.json` — from `contracts/out/PredictionMarket_v3.sol/PredictionMarketV3.json` → extract `abi` array
- `MarketFactoryV3.json` — from `contracts/out/MarketFactory_v3.sol/MarketFactoryV3.json` → extract `abi` array
- `OutcomeToken.json` — **UNCHANGED**

### 2. Uniswap Price Service — `services/uniswap.ts` (NEW)

```typescript
// Fetches token price in USD from Uniswap API
// GET https://api.uniswap.org/v2/quote
// Converts float price → int256 (18 decimals) for contract
export async function getUniswapPrice(chainId: number, tokenAddress: string): Promise<bigint>
```

- Uses `UNISWAP_API_KEY` from env (required for Uniswap Developer API)
- Returns `BigInt(price * 1e18)` as `int256` compatible value
- Fallback: if API fails, throw (don't resolve with bad data)

### 3. `services/chain.ts` — Swap V2 ABI → V3 ABI

**Replace all imports:**
```
PredictionMarketV2Abi → PredictionMarketV3Abi
MarketFactoryV2Abi → MarketFactoryV3Abi
```

**Update `MarketOnChainData` interface:**
```typescript
// Remove:
snapshotTick: number;
currentTick: number;

// Add:
snapshotPrice: string;      // int256 as string
resolutionPrice: string;    // int256 as string
oracleEndpoint: string;
sourceChainId: bigint;
sourcePool: string;
sourceToken: string;
```

**Update `readMarketData()`:**
- Remove `snapshotTick` and `getCurrentTick` reads
- Add `snapshotPrice`, `resolutionPrice`, `oracleEndpoint`, `sourceChainId`, `sourcePool`, `sourceToken` reads

**Remove:** `getPoolToken0()` — no longer needed (no on-chain pool lookup)

### 4. `services/txbuilder.ts` — Swap ABI

Replace `PredictionMarketV2Abi` → `PredictionMarketV3Abi`. All function names (`buy`, `sell`, `mint`, `redeem`, `claim`, `addLiquidity`, `removeLiquidity`) are identical — just the ABI import changes.

### 5. `services/resolver.ts` — `resolve(int256)` with Uniswap price

**Before (V2):**
```typescript
resolve() — no args, contract reads price
```

**After (V3):**
```typescript
// 1. Read sourceChainId + sourceToken from contract
// 2. Fetch price from Uniswap API
// 3. Call resolve(price)
```

### 6. `routes/admin.ts` — `createMarket` with oracle metadata

**Before (V2):**
```typescript
args: [question, resolutionTime, liquidityBigInt, poolAddress, token0IsQuote]
```

**After (V3):**
```typescript
// 1. Fetch snapshotPrice from Uniswap API
// 2. Build oracle metadata
args: [question, resolutionTime, liquidityBigInt, oracleEndpoint, sourceChainId, sourcePool, sourceToken, snapshotPrice]
```

- Remove `token0IsQuote` / `getPoolToken0` logic
- Add `sourceChainId` param (from request body, defaults to 8453 for Base)
- `oracleEndpoint` = `"https://api.uniswap.org/v2/quote"`

### 7. `routes/markets.ts` — Update response fields

- Remove `snapshotTick`, `currentTick` from response
- Add `snapshotPrice`, `resolutionPrice`, `oracleEndpoint`, `sourceChainId`, `sourcePool`, `sourceToken`
- Replace `PredictionMarketV2Abi` → `PredictionMarketV3Abi` in price endpoint

### 8. `routes/user.ts` — Swap ABI reference

`readUserPositions` uses `PredictionMarketV2Abi` for `lpBalances` — swap to V3.

### 9. DB Migration — `002_v3_columns.sql`

```sql
ALTER TABLE markets ADD COLUMN source_chain_id INTEGER;
ALTER TABLE markets ADD COLUMN source_pool TEXT;
ALTER TABLE markets ADD COLUMN source_token TEXT;
ALTER TABLE markets ADD COLUMN oracle_endpoint TEXT;
ALTER TABLE markets ADD COLUMN snapshot_price TEXT;
```

Update `insertMarket()` and `MarketRow` interface to include new columns.

### 10. Config — Add `UNISWAP_API_KEY`

```typescript
uniswapApiKey: process.env.UNISWAP_API_KEY || '',
```

Add to `.env.example`.

---

## Files Changed

```
api/src/
  abi/
    PredictionMarketV3.json    -- NEW (from contracts/out/)
    MarketFactoryV3.json       -- NEW (from contracts/out/)
    OutcomeToken.json          -- UNCHANGED
    PredictionMarketV2.json    -- KEEP (for V2 market reads if needed)
    MarketFactoryV2.json       -- KEEP
  services/
    chain.ts                   -- MODIFIED: V3 ABI, new readMarketData fields
    txbuilder.ts               -- MODIFIED: V3 ABI import
    resolver.ts                -- MODIFIED: resolve(price) with Uniswap API
    uniswap.ts                 -- NEW: getUniswapPrice()
    clanker.ts                 -- UNCHANGED
  routes/
    admin.ts                   -- MODIFIED: createMarket with oracle params
    markets.ts                 -- MODIFIED: V3 response fields
    trade.ts                   -- UNCHANGED (txbuilder handles ABI)
    liquidity.ts               -- UNCHANGED
    tokens.ts                  -- UNCHANGED
    user.ts                    -- MODIFIED: V3 ABI in chain reads
  db/
    index.ts                   -- MODIFIED: new columns in MarketRow + insertMarket
    migrations/
      001_init.sql             -- UNCHANGED
      002_v3_columns.sql       -- NEW
  config.ts                    -- MODIFIED: add uniswapApiKey
  index.ts                     -- UNCHANGED
```

---

## Epics & Story Points

**1 SP ≈ 30 min.**

### Epic A1: ABIs + Config (0.5 SP)
| ID | Task | SP |
|----|------|----|
| A1.1 | Extract V3 ABIs from `contracts/out/` → `api/src/abi/` | 0.25 |
| A1.2 | Add `UNISWAP_API_KEY` to config + `.env.example` | 0.25 |

### Epic A2: Uniswap Price Service (1 SP)
| ID | Task | SP |
|----|------|----|
| A2.1 | Create `services/uniswap.ts` — `getUniswapPrice(chainId, tokenAddress)` | 0.75 |
| A2.2 | Handle errors, rate limits, price format (float → int256 × 1e18) | 0.25 |

### Epic A3: Chain Service + TxBuilder (1 SP)
| ID | Task | SP |
|----|------|----|
| A3.1 | Swap ABI imports in `chain.ts` (V2 → V3) | 0.25 |
| A3.2 | Update `MarketOnChainData` interface + `readMarketData()` | 0.5 |
| A3.3 | Swap ABI import in `txbuilder.ts` | 0.1 |
| A3.4 | Remove `getPoolToken0()` from `chain.ts` | 0.15 |

### Epic A4: Resolver (0.75 SP)
| ID | Task | SP |
|----|------|----|
| A4.1 | Read `sourceChainId` + `sourceToken` from contract in resolver | 0.25 |
| A4.2 | Fetch price from Uniswap API, call `resolve(price)` | 0.5 |

### Epic A5: Admin Route (1 SP)
| ID | Task | SP |
|----|------|----|
| A5.1 | Update `createMarket` — fetch snapshot price, build oracle metadata | 0.5 |
| A5.2 | Pass new args to V3 factory `createMarket()` | 0.25 |
| A5.3 | Update `resolve` endpoint — fetch price, call `resolve(price)` | 0.25 |

### Epic A6: Markets Route + User Route (0.5 SP)
| ID | Task | SP |
|----|------|----|
| A6.1 | Update market list/detail response: V3 fields | 0.25 |
| A6.2 | Update user route ABI reference | 0.1 |
| A6.3 | Update price endpoint ABI | 0.15 |

### Epic A7: DB Migration (0.5 SP)
| ID | Task | SP |
|----|------|----|
| A7.1 | `002_v3_columns.sql` — add V3 columns | 0.15 |
| A7.2 | Update `MarketRow` interface + `insertMarket()` | 0.2 |
| A7.3 | Run migration, verify | 0.15 |

### Epic A8: Smoke Test (0.75 SP)
| ID | Task | SP |
|----|------|----|
| A8.1 | `npm run dev` — starts without errors | 0.1 |
| A8.2 | Create market via API → verify on-chain | 0.25 |
| A8.3 | Wait for auto-resolve → verify resolution with Uniswap price | 0.25 |
| A8.4 | Verify market list, detail, user positions all return V3 fields | 0.15 |

---

## Implementation Order

```
A1 (ABIs) → A7 (DB) → A2 (Uniswap) → A3 (Chain+TxBuilder) → A4 (Resolver) → A5 (Admin) → A6 (Routes) → A8 (Test)
```

**Total: 6 SP ≈ 3 hours**

---

## Breaking Changes

- **ABI**: All contract reads use V3 ABI — V2 markets created before upgrade won't be readable unless we keep V2 ABI for old markets
- **DB**: New columns are nullable — old rows still work
- **API response**: `snapshotTick`/`currentTick` replaced by `snapshotPrice`/`resolutionPrice`
- **Frontend**: Must handle new response shape (but most fields are additive)

---

## Notes

- `.env` already has `FACTORY_ADDRESS=0x4759219b2eb34d8645391E6Bd12B15E35b4e1866` (V3)
- CPMM functions are identical in V3 — `txbuilder.ts` just needs ABI swap
- Old V2 markets in DB will fail `readMarketData` with V3 ABI — consider clearing DB or keeping V2 ABI as fallback
- Uniswap API key: get from https://api-docs.uniswap.org/ — needed for bounty qualification
