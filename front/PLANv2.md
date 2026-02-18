# Frontend PLANv2 — Integration with V2 Contracts & API

## Current State Assessment

### What's built (UI-complete, mock data only)
| Page/Component | Status | Notes |
|---|---|---|
| `app/page.tsx` | ✅ UI done | Hardwired to `mockMarkets`, no API call |
| `app/market/[address]/page.tsx` | ✅ UI done | Hardwired to `mockMarkets`, no API call |
| `app/portfolio/page.tsx` | ✅ UI done | Hardwired to `mockPositions` / `mockClaimable` |
| `app/admin/page.tsx` | ✅ UI done | Mock handlers, `ADMIN_ADDRESS` hardcoded |
| `components/trade-panel.tsx` | ✅ UI done | `handleTrade` is a toast stub, no wallet TX |
| `components/claim-panel.tsx` | ✅ UI done | `handleClaim` is a toast stub, no wallet TX |
| `components/mint-redeem-panel.tsx` | ✅ UI done | Stub |
| `components/liquidity-panel.tsx` | ✅ UI done | Stub |
| `lib/api.ts` | ✅ Correct | All endpoints match our API exactly |
| `types/market.ts` | ⚠️ Partial | Missing new V2 fields |

---

## Gaps: Frontend vs API/Contracts

### 1. `types/market.ts` — Missing fields
The `Market` type is missing fields our API now returns:

| Missing field | Source | Used by |
|---|---|---|
| `tokenAddress` | API | Market card (show token), admin create |
| `tokenSymbol` | API | Market card title (`$MEME`), question |
| `tokenName` | API | Market card |
| `tokenImg` | API | Market card avatar |
| `poolAddress` | API | Market info panel |
| `yesPrice` | API | Market card (replaces `calculateYesPrice()`) |
| `noPrice` | API | Market card |
| `snapshotTick` | API | Market info panel (oracle info) |
| `currentTick` | API | Market info panel (live oracle) |
| `yesTokenAddress` | API | Needed for approve flow |
| `noTokenAddress` | API | Needed for approve flow |
| `txHash` | API | Market info panel |
| `totalVolume` | ❌ NOT in API | API has no volume tracking — **drop or compute** |

**`totalVolume` is not tracked anywhere** — the API has no volume field. Either drop it from the UI or compute it as `yesReserve + noReserve` as a proxy.

### 2. `MarketPrice` type mismatch
Frontend expects `yesPrice: number` (0–1 float), but API returns `yesPrice: string` (BPS, 0–10000).
Need to divide by 10000 when consuming.

### 3. `Position` type mismatch
Frontend has `currentValue` and `lpBalance` (string), API returns `lpBalance` (bigint string). Minor alignment needed.

### 4. `ClaimableWinning` type mismatch
Frontend has `winningTokenBalance`, API returns `claimableAmount`. Field rename needed.

### 5. `lib/api.ts` — Admin `createMarket` signature mismatch
Frontend sends `{ question, resolutionTime, initialLiquidity }`.
API expects `{ tokenAddress, initialLiquidity }` — it derives question, resolutionTime, pool from Clanker.

**This is a fundamental UX change**: admin no longer writes a free-form question. They pick a token, the API does the rest.

### 6. `lib/api.ts` — Admin `resolveMarket` sends `{ yesWins }`
API's `POST /admin/markets/:address/resolve` ignores `yesWins` — the contract reads the oracle. The body param is irrelevant. Frontend should just call resolve with no body.

### 7. `lib/api.ts` — Missing `approve` endpoint
Frontend panels need to call `POST /api/markets/:address/approve` before buy/mint/addLiquidity. Currently no approve step exists in any panel.

### 8. `lib/api.ts` — Missing `claim` endpoint
`api.trade` has no `buildClaim`. Exists in API (`POST /api/markets/:address/claim`) but not in `api.ts`.

### 9. `lib/api.ts` — Missing `tokens` endpoints
`GET /api/tokens/trending` and `GET /api/tokens/:address` exist in API but not in `api.ts`. Needed for admin market creation flow.

### 10. All pages use `mockMarkets` — no real data fetching
Every page needs to switch from `mockMarkets` to `api.markets.list()` / `api.markets.get()`.

### 11. All action handlers are toast stubs — no wallet integration
Every button (`Buy`, `Sell`, `Mint`, `Redeem`, `Claim`, `Add Liquidity`, `Remove Liquidity`) needs to:
1. Call API to get `TxData` (`{to, data, value}`)
2. Send TX via wagmi `useSendTransaction`
3. Wait for confirmation

### 12. Admin page — wrong UX for V2
Current admin form: free-form question + date/time picker + liquidity.
V2 admin flow: pick token from Clanker trending list → set liquidity → API handles everything else.
The "Resolve YES / Resolve NO" buttons are also wrong — resolution is oracle-driven, just one "Trigger Resolve" button.

### 13. `contracts.factory` is empty in `config.ts`
`factory: '' as \`0x\${string}\`` — needs to be set after deployment.

---

## Priority Work Items

### P0 — Blockers (nothing works without these)
1. **Deploy contracts** → fill `FACTORY_ADDRESS` in `api/.env` and `front/.env.local`
2. **Update `types/market.ts`** — add all missing fields, fix `MarketPrice` BPS→float, fix `ClaimableWinning` field name
3. **Wire `app/page.tsx`** to `api.markets.list()` — replace `mockMarkets`
4. **Wire `app/market/[address]/page.tsx`** to `api.markets.get(address)` — replace `mockMarkets.find()`
5. **Add `approve` + `claim` to `lib/api.ts`** — missing endpoints

### P1 — Core functionality (app is usable)
6. **Wire `TradePanel`** — call `buildBuy`/`buildSell` → `useSendTransaction` (with USDC approve step)
7. **Wire `ClaimPanel`** — call `buildClaim` → `useSendTransaction` (no approve needed)
8. **Wire `MintRedeemPanel`** — call `buildMint`/`buildRedeem` → `useSendTransaction`
9. **Wire `LiquidityPanel`** — call `buildAdd`/`buildRemove` → `useSendTransaction`
10. **Wire `app/portfolio/page.tsx`** to `api.user.getPositions()` + `api.user.getClaimable()`

### P2 — Admin & polish
11. **Rewrite `app/admin/page.tsx`**:
    - Replace free-form form with token picker (from `GET /api/tokens/trending`)
    - Replace "Resolve YES/NO" with single "Trigger Resolve" button (oracle decides)
    - Wire to `api.admin.createMarket({ tokenAddress, initialLiquidity })`
    - Wire to `api.admin.resolveMarket(address)` (no yesWins param)
12. **Market card** — show token image + symbol, use API `yesPrice`/`noPrice` (BPS) instead of `calculateYesPrice()`
13. **Drop `totalVolume`** from `Market` type and UI, or replace with `yesReserve + noReserve` as proxy
14. **Add `tokens` to `lib/api.ts`** — `getTrending()`, `getToken(address)`

### P3 — Nice to have
15. **Market page oracle info** — show `snapshotTick`, `currentTick`, countdown to resolution
16. **Auto-refresh prices** — poll `GET /api/markets/:address/price` every 10s on market page
17. **`lib/mock-data.ts`** — can be deleted once all pages are wired

---

## API ↔ Frontend Field Mapping (source of truth)

### `GET /api/markets` → `Market[]`
```
API field          → Frontend type field
─────────────────────────────────────────
address            → address: string          ✅ match
tokenAddress       → tokenAddress: string     ➕ add
tokenSymbol        → tokenSymbol: string      ➕ add
tokenName          → tokenName: string        ➕ add
tokenImg           → tokenImg: string|null    ➕ add
poolAddress        → poolAddress: string      ➕ add
question           → question: string         ✅ match
resolutionTime     → resolutionTime: number   ✅ match
resolved           → resolved: boolean        ✅ match
yesWins            → yesWins?: boolean        ✅ match
yesReserve         → yesReserve: string       ✅ match (bigint string)
noReserve          → noReserve: string        ✅ match (bigint string)
yesPrice           → yesPrice: string (BPS)   ➕ add (divide by 10000 for display)
noPrice            → noPrice: string (BPS)    ➕ add
snapshotTick       → snapshotTick: number     ➕ add
currentTick        → currentTick: number      ➕ add
yesTokenAddress    → yesTokenAddress: string  ➕ add
noTokenAddress     → noTokenAddress: string   ➕ add
createdAt          → createdAt: number        ✅ match
txHash             → txHash: string|null      ➕ add
totalVolume        → ❌ NOT in API            🗑️ drop or compute
```

### `GET /api/users/:address/claimable` → `ClaimableWinning[]`
```
API field          → Frontend type field
─────────────────────────────────────────
marketAddress      → marketAddress: string    ✅ match
question           → question: string         ✅ match
yesWins            → yesWins: boolean         ✅ match
claimableAmount    → winningTokenBalance       ⚠️ rename API field OR frontend field
tokenSymbol        → (not in frontend type)   ➕ add
```

### `POST /api/admin/markets` body
```
Frontend sends:    { question, resolutionTime, initialLiquidity }  ❌ WRONG
API expects:       { tokenAddress, initialLiquidity }              ✅ CORRECT
```

---

## What to Keep As-Is
- All UI styling, layout, neo-brutalist design — **100% keep**
- `lib/utils.ts` — `formatUSDC`, `formatPercentage`, `parseUSDC` — keep
- `lib/wagmi.ts` — RainbowKit/wagmi config — keep
- `lib/config.ts` — keep, just fill `factory` address after deploy
- `components/market-card-skeleton.tsx` — keep
- `components/header.tsx` — keep
- `app/layout.tsx`, `app/providers.tsx` — keep
- `app/globals.css` — keep

## What to Delete After Wiring
- `lib/mock-data.ts` — delete once all pages use real API
- `calculateYesPrice()` / `calculateNoPrice()` — replace with API BPS prices

---

## Suggested Implementation Order
```
1. types/market.ts          — update types first, TS will flag all broken usages
2. lib/api.ts               — add missing endpoints (approve, claim, tokens)
3. app/page.tsx             — wire to api.markets.list()
4. app/market/[address]     — wire to api.markets.get()
5. components/trade-panel   — wire buy/sell with approve flow
6. components/claim-panel   — wire claim
7. components/mint-redeem   — wire mint/redeem with approve
8. components/liquidity     — wire add/remove with approve
9. app/portfolio/page.tsx   — wire positions + claimable
10. app/admin/page.tsx      — rewrite for V2 flow (token picker, single resolve)
11. market-card.tsx         — show token img/symbol, use API prices
12. Delete mock-data.ts
```
