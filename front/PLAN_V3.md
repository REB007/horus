# Horus Frontend V3 — Upgrade Plan

> **Scope:** Wire frontend to V3 API response shape. Permissionless market creation. Remove dead V2 fields.

---

## TL;DR — What Changes

| What | V2 | V3 |
|------|----|----|
| **Market type** | `snapshotTick`, `currentTick` | `snapshotPrice`, `resolutionPrice`, oracle metadata |
| **Market creation** | Admin-only (`/admin` page, server-side TX) | Permissionless — any connected wallet can create via on-chain TX |
| **Create flow** | Admin calls API → API signs TX | User approves USDC → user calls factory `createMarket()` directly |
| **Oracle display** | "Uniswap V3 tick" | "Uniswap Price API" with `snapshotPrice` / `resolutionPrice` in USD |
| **Config** | `factory: 0x93ebd...` (V2) | `factory: 0x4759...` (V3) |
| **Admin page** | Create + Resolve | Resolve only (creation moves to new `/create` page) |
| **Nav** | Markets · Portfolio · Admin | Markets · Create · Portfolio · Admin |

---

## Detailed Changes

### 1. `types/market.ts` — Update Market interface

```diff
- snapshotTick: number;
- currentTick: number;
+ snapshotPrice: string;
+ resolutionPrice: string;
+ oracleEndpoint: string;
+ sourceChainId: string;
+ sourcePool: string;
+ sourceToken: string;
```

### 2. `lib/config.ts` — Update factory address

```diff
- factory: '0x93ebd335231Ae3Ce4859BfD56A9351c11A55d822'
+ factory: '0x4759219b2eb34d8645391E6Bd12B15E35b4e1866'
```

### 3. `lib/api.ts` — Update `admin.createMarket` params

**Before (V2):**
```typescript
createMarket: (params: {
  tokenAddress: string;
  poolAddress: string;
  token0IsQuote: boolean;
  ...
})
```

**After (V3):**
```typescript
createMarket: (params: {
  tokenAddress: string;
  poolAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  initialLiquidity: number;
  sourceChainId?: number;
})
```

Also update `resolveMarket` response type to include `resolutionPrice`.

### 4. `app/create/page.tsx` — NEW: Permissionless market creation page

This is the **big new feature**. Any connected wallet can create a market:

1. User picks a token (from Clanker trending or manual address)
2. User enters initial liquidity (≥ 10 USDC)
3. Frontend fetches snapshot price from API (or Uniswap API directly)
4. User signs two TXs:
   - **Approve** USDC to factory
   - **createMarket** on factory contract (with oracle metadata)
5. Market appears in list

This replaces the admin-only creation flow. The API `POST /api/admin/markets` still works as a backend fallback but the primary UX is now wallet-signed.

**Implementation options:**
- **Option A (simpler):** Keep using the API — `POST /api/admin/markets` already handles approve + create. Just move the UI from `/admin` to `/create` and remove the admin gate.
- **Option B (fully permissionless):** User signs TXs directly via wagmi. Requires importing the factory ABI in the frontend and calling `writeContract` with the user's wallet.

**Recommended: Option A first** (API-mediated, fast to ship), then Option B later for true permissionless.

### 5. `app/admin/page.tsx` — Simplify to resolve-only

- Remove the "Create Market" section (moved to `/create`)
- Keep the "Resolve Markets" section
- Update auto-resolver description: `resolve(price)` not `resolve()`
- Update oracle label: "Uniswap Price API" not "Uniswap V3 tick"

### 6. `app/market/[address]/page.tsx` — Replace tick display with price

**Stats row (line ~152):**
```diff
- tick {market.currentTick > market.snapshotTick ? '↑' : ...}
+ price {resolutionPrice > snapshotPrice ? '↑' : ...}
```

**Sidebar oracle section (lines ~188–200):**
```diff
- <div className="text-[#666666]">Snapshot tick</div>
- <div className="text-white">{market.snapshotTick}</div>
- <div className="text-[#666666]">Current tick</div>
- <div>{market.currentTick}</div>
+ <div className="text-[#666666]">Snapshot Price</div>
+ <div className="text-white">${formatPrice18(market.snapshotPrice)}</div>
+ <div className="text-[#666666]">Resolution Price</div>
+ <div>{market.resolved ? `$${formatPrice18(market.resolutionPrice)}` : '—'}</div>
```

Add oracle metadata display:
```
Oracle: Uniswap Price API
Chain: Base (8453)
Token: 0x4200...0006
```

### 7. `lib/utils.ts` — Add `formatPrice18` helper

```typescript
/** Format an int256 with 18 decimals to a human-readable USD string */
export function formatPrice18(raw: string): string {
  if (!raw || raw === '0') return '0.00';
  const n = Number(BigInt(raw)) / 1e18;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
```

### 8. `components/header.tsx` — Add "Create" nav link

```diff
  <Link href="/">Markets</Link>
+ <Link href="/create">Create</Link>
  <Link href="/portfolio">Portfolio</Link>
  <Link href="/admin">Admin</Link>
```

### 9. `components/market-card.tsx` — No changes needed

The card only uses `yesPrice`, `noPrice`, `yesReserve`, `noReserve`, `resolved`, `yesWins` — all unchanged in V3.

### 10. Other components — No changes needed

- `trade-panel.tsx` — uses `yesPrice`/`noPrice` only
- `mint-redeem-panel.tsx` — uses market address only
- `liquidity-panel.tsx` — uses market address only
- `claim-panel.tsx` — uses `resolved`/`yesWins` only

---

## Files Changed

```
front/
  types/
    market.ts                -- MODIFIED: replace tick fields with price/oracle fields
  lib/
    config.ts                -- MODIFIED: update factory address
    api.ts                   -- MODIFIED: update createMarket params + response types
    utils.ts                 -- MODIFIED: add formatPrice18()
    wagmi.ts                 -- UNCHANGED
    mock-data.ts             -- UNCHANGED (or update if used)
  app/
    page.tsx                 -- UNCHANGED (market list)
    layout.tsx               -- UNCHANGED
    providers.tsx            -- UNCHANGED
    create/
      page.tsx               -- NEW: permissionless market creation
    admin/
      page.tsx               -- MODIFIED: remove create section, update oracle text
    market/
      [address]/
        page.tsx             -- MODIFIED: replace tick with price, add oracle metadata
    portfolio/
      page.tsx               -- UNCHANGED
  components/
    header.tsx               -- MODIFIED: add "Create" nav link
    market-card.tsx           -- UNCHANGED
    market-card-skeleton.tsx  -- UNCHANGED
    trade-panel.tsx           -- UNCHANGED
    mint-redeem-panel.tsx     -- UNCHANGED
    liquidity-panel.tsx       -- UNCHANGED
    claim-panel.tsx           -- UNCHANGED
    custom-connect-button.tsx -- UNCHANGED
```

---

## Epics & Story Points

**1 SP ≈ 30 min.**

### Epic F1: Types + Config (0.5 SP)
| ID | Task | SP |
|----|------|----|
| F1.1 | Update `Market` interface: remove ticks, add price/oracle fields | 0.25 |
| F1.2 | Update `lib/config.ts`: factory address to V3 | 0.1 |
| F1.3 | Add `formatPrice18()` to `lib/utils.ts` | 0.15 |

### Epic F2: API Client (0.5 SP)
| ID | Task | SP |
|----|------|----|
| F2.1 | Update `api.admin.createMarket` params (remove `token0IsQuote`, add `sourceChainId`) | 0.25 |
| F2.2 | Update `api.admin.resolveMarket` response type (add `resolutionPrice`) | 0.25 |

### Epic F3: Create Market Page (2 SP)
| ID | Task | SP |
|----|------|----|
| F3.1 | Create `app/create/page.tsx` — token picker + liquidity input + create button | 1.0 |
| F3.2 | Wire to API `POST /api/admin/markets` (API-mediated, fast to ship) | 0.5 |
| F3.3 | Show snapshot price after Uniswap API fetch | 0.25 |
| F3.4 | Add "Create" link to header nav | 0.25 |

### Epic F4: Market Detail Page (1 SP)
| ID | Task | SP |
|----|------|----|
| F4.1 | Replace tick display with price display in stats row | 0.25 |
| F4.2 | Replace tick sidebar with snapshotPrice / resolutionPrice | 0.25 |
| F4.3 | Add oracle metadata display (endpoint, chain, token) | 0.25 |
| F4.4 | Update oracle label text | 0.25 |

### Epic F5: Admin Page (0.5 SP)
| ID | Task | SP |
|----|------|----|
| F5.1 | Remove "Create Market" section from admin page | 0.25 |
| F5.2 | Update auto-resolver description text | 0.25 |

### Epic F6: Smoke Test (0.5 SP)
| ID | Task | SP |
|----|------|----|
| F6.1 | `npm run dev` — no errors | 0.1 |
| F6.2 | Market list loads with V3 fields | 0.1 |
| F6.3 | Market detail shows price instead of tick | 0.1 |
| F6.4 | Create page creates a market (if USDC available) | 0.2 |

---

## Implementation Order

```
F1 (Types+Config) → F2 (API Client) → F3 (Create Page) → F4 (Market Detail) → F5 (Admin) → F6 (Test)
```

**Total: 5 SP ≈ 2.5 hours**

---

## Breaking Changes

- **`snapshotTick` / `currentTick`** removed from `Market` type — any component referencing these will break
- **`token0IsQuote`** removed from `createMarket` params
- **Factory address** updated — old address won't work
- **Admin page** no longer has create section — users go to `/create`

---

## Notes

- Market creation is still API-mediated in this plan (Option A). True permissionless (user signs factory TX directly) can be added later as F3.5.
- The API already handles approve + createMarket, so the frontend just needs to POST to the API.
- Old V2 markets in the DB will have `snapshotPrice: '0'` and `resolutionPrice: '0'` — the UI should handle this gracefully.
- `market-card.tsx` doesn't need changes — it only uses price/reserve/resolved fields that are unchanged.
