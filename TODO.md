# Horus — Hackathon TODO

> **We are building V3.** V2 is deployed and working but superseded.
> V3 = multi-chain oracle + permissionless creation + zkTLS-ready resolution.
> Work top-to-bottom. Each phase unblocks the next.

---

## Status Overview

| Layer | V2 Status | V3 Status |
|-------|-----------|-----------|
| **Contracts** | ✅ Deployed on Sepolia | 🔴 Not started — see `contracts/PLAN_V3.md` + `contracts/planv3.yaml` |
| **API** | ✅ Running locally | 🔴 Needs update for V3 ABI — plan TBD (`api/PLAN_V3.md`) |
| **Frontend** | ✅ Wired to V2 API | 🟡 Mostly works — just needs new factory address + ABI after V3 deploy |

---

## V2 (DONE — reference only)

<details>
<summary>Click to expand V2 completed work</summary>

- [x] Contracts deployed: `MarketFactoryV2` at `0x93ebd335231Ae3Ce4859BfD56A9351c11A55d822`
- [x] USDC (Sepolia): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- [x] API running on port 8080 with auto-resolver, Clanker proxy, TX builders
- [x] Frontend fully wired: all pages use real API, all panels send real TXs
- [x] Silent background polling (no loading flash)
- [x] BigInt undefined guards on all market fields

</details>

---

## Phase 1 — V3 Contracts (🔴 CURRENT PRIORITY)

> **Plan:** `contracts/PLAN_V3.md` · **Sprint:** `contracts/planv3.yaml`
> **Key changes:** oracle decoupled from chain, 3-path resolution, permissionless creation

- [x] **1.1** `IZkTlsVerifier.sol` — skipped (not in scope per PLAN_V3.md)
- [x] **1.2** `PredictionMarket_v3.sol` — oracle metadata + submitted price, `resolve(int256)`
- [x] **1.3** `MarketFactory_v3.sol` — permissionless, `MIN_LIQUIDITY = 10 USDC`, oracle params
- [x] **1.4** `PredictionMarketV3.t.sol` — 12 tests, all green
- [x] **1.5** `forge build && forge test --match-path test/v3/*` — 12/12 pass
- [x] **1.6** Deployed to Sepolia
- [x] **1.7** `MarketFactoryV3`: `0x4759219b2eb34d8645391E6Bd12B15E35b4e1866`

---

## Phase 2 — V3 API Update (🔴 BLOCKED on Phase 1)

> **Plan:** TBD — `api/PLAN_V3.md`
> **Key changes:** Uniswap API for price reads, new ABI, `resolveAdmin(price)` instead of `resolve()`

- [ ] **2.1** Copy V3 ABIs from `contracts/out/` → `api/src/abi/`
- [ ] **2.2** Add `getUniswapPrice(chainId, tokenAddress)` service — calls Uniswap Developer API
- [ ] **2.3** Update `createMarket` route: fetch snapshot price from Uniswap API, pass oracle metadata
- [ ] **2.4** Update `resolve` route: fetch resolution price from Uniswap API, call `resolveAdmin(price)`
- [ ] **2.5** Update auto-resolver to call `resolveAdmin(price)` with Uniswap API price
- [ ] **2.6** Update `readMarketData()` to read new V3 state vars
- [ ] **2.7** Update `FACTORY_ADDRESS` in `.env`
- [ ] **2.8** Smoke test: create market → auto-resolve → verify

---

## Phase 3 — V3 Frontend Update (🟡 BLOCKED on Phase 2)

> **Plan:** TBD — `front/plan/PLAN_V3.md`
> **Most of the frontend works unchanged** — API abstracts contract changes.

- [ ] **3.1** Update `factory` address in `front/lib/config.ts`
- [ ] **3.2** Update ABI imports if any frontend components call contracts directly
- [ ] **3.3** Verify all pages still work with V3 API responses
- [ ] **3.4** Add WalletConnect project ID (https://cloud.reown.com)
- [ ] **3.5** Delete `lib/mock-data.ts` (orphaned, nothing imports it)

---

## Phase 4 — E2E Test (local, Ethereum Sepolia)

- [ ] **4.1** Admin: pick token → create market → confirm it appears on homepage
- [ ] **4.2** User: connect MetaMask (Sepolia) → buy YES → confirm TX on Etherscan
- [ ] **4.3** Wait for `resolutionTime` → confirm auto-resolver fires with Uniswap API price
- [ ] **4.4** User: portfolio → claim winnings → confirm USDC received
- [ ] **4.5** Test emergency resolve: create market, don't resolve, wait 24h (or use `vm.warp` in test)

---

## Phase 5 — Deploy

- [ ] **5.1** **Frontend → Vercel**: `cd front && vercel --prod`
  - Env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_CHAIN_ID=11155111`
- [ ] **5.2** **API → Render**:
  - Root: `api/` · Build: `npm install && npm run build` · Start: `npm start`
  - Env vars from `api/.env` + `UNISWAP_API_KEY`
  - SQLite is ephemeral on free tier (fine for hackathon)
- [ ] **5.3** Update `NEXT_PUBLIC_API_URL` in Vercel → live Render URL
- [ ] **5.4** Full E2E smoke test on live URLs

---

## Phase 6 — Farcaster MiniApp (stretch)

- [ ] **6.1** Scaffold Farcaster Frame showing active market list
- [ ] **6.2** "Buy YES / Buy NO" action → deep-link to market page
- [ ] **6.3** Register frame URL with Warpcast

---

## Bounties

| Bounty | How we qualify | Status |
|--------|---------------|--------|
| **Uniswap API ($5k)** | API uses Uniswap Developer API for snapshot + resolution price reads | 🔴 Phase 2 |
| **General track** | Fully on-chain prediction market, multi-chain oracle, zkTLS-ready | 🟡 V3 contracts needed |

---

## Architecture (V3)

```
User picks token (any chain) → API fetches price from Uniswap API → submits to contract
                                                                          ↓
Market created on Sepolia ← oracle metadata stored on-chain (endpoint, chainId, pool, token)
                                                                          ↓
10 min later → API fetches resolution price from Uniswap API → calls resolveAdmin(price)
                                                                          ↓
                                    OR after grace period: anyone submits zkTLS proof
                                    OR after 24h: anyone calls resolveEmergency()
```

---

## Key Addresses (Ethereum Sepolia)

| Contract | Address | Version |
|----------|---------|---------|
| MarketFactoryV2 | `0x93ebd335231Ae3Ce4859BfD56A9351c11A55d822` | V2 (superseded) |
| MarketFactoryV3 | `0x4759219b2eb34d8645391E6Bd12B15E35b4e1866` | V3 ✅ |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | — |

---

## Dropped / Post-Hackathon

- ~~Move API to Next.js~~ — resolver needs persistent process
- ~~Bonding curve~~ — CPMM works
- ~~Base Sepolia~~ — switched to Ethereum Sepolia
- ~~V2 on-chain oracle~~ — replaced by submitted price + Uniswap API in V3
