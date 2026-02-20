# Frontend Integration Plan

## Current State
- UI is fully built with neobrutalist design, all pages exist
- Everything runs off **mock data** (`lib/mock-data.ts`)
- Chain is hardcoded to **Base Sepolia** (wrong — we deployed to Ethereum Sepolia)
- Wallet transactions show toasts but **never send real TXs**
- `lib/config.ts` has wrong USDC address and empty factory address
- `lib/wagmi.ts` uses `baseSepolia` chain

## What Needs To Be Done

### E1 — Config & Chain (15 min)
- Switch wagmi chain from `baseSepolia` → `sepolia`
- Update `lib/config.ts`: correct USDC, factory, chainId (11155111)
- Update `front/.env.local` with correct chainId and API URL

### E2 — Replace Mock Data with Real API (30 min)
- `app/page.tsx`: replace `mockMarkets` with `api.markets.list()` via `useEffect`
- `app/market/[address]/page.tsx`: replace `mockMarkets.find()` with `api.markets.get(address)`
- `app/portfolio/page.tsx`: replace `mockPositions`/`mockClaimable` with `api.user.*` calls
- `app/admin/page.tsx`: replace `mockMarkets` + `mockTrendingTokens` with real API calls

### E3 — Wire Real Wallet Transactions (45 min)
Each panel currently calls `toast.success("TX would be sent")`. Replace with:
1. Call API to get tx calldata (`buildBuy`, `buildSell`, etc.)
2. Call `useWriteContract` / `useSendTransaction` with the returned `{to, data}`
3. Wait for receipt with `useWaitForTransactionReceipt`
4. Show toast on success/error

Panels to wire:
- `TradePanel` — buy / sell
- `MintRedeemPanel` — mint / redeem (needs USDC approve first)
- `ClaimPanel` — claim
- `LiquidityPanel` — add / remove liquidity
- `AdminPage` — createMarket (needs USDC approve) + resolve

### E4 — Admin: Real Clanker Token List (15 min)
- Replace `mockTrendingTokens` with `api.tokens.trending()` call
- Show loading state while fetching

### E5 — Polish & Error States (15 min)
- Add loading skeletons where missing (market detail page)
- Add error boundaries / empty states for API failures
- Auto-refresh market data every 10s on market detail page (for live tick updates)

## Files to Modify
| File | Change |
|---|---|
| `front/.env.local` | chainId → 11155111 |
| `lib/config.ts` | USDC + factory addresses, chainId |
| `lib/wagmi.ts` | baseSepolia → sepolia |
| `lib/api.ts` | fix admin.createMarket signature |
| `app/page.tsx` | real API, useEffect |
| `app/market/[address]/page.tsx` | real API + auto-refresh |
| `app/portfolio/page.tsx` | real API + real claim TX |
| `app/admin/page.tsx` | real API + real TXs |
| `components/trade-panel.tsx` | real buy/sell TXs |
| `components/mint-redeem-panel.tsx` | real mint/redeem TXs |
| `components/claim-panel.tsx` | real claim TX |
| `components/liquidity-panel.tsx` | real add/remove TXs |

## Deployment Addresses (Ethereum Sepolia)
- **Chain ID**: 11155111
- **Factory**: `0x93ebd335231Ae3Ce4859BfD56A9351c11A55d822`
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **WETH**: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`
