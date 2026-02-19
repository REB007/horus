# Horus — Hackathon TODO

> Work top-to-bottom. Each phase unblocks the next.

---

## Phase 1 — Contracts: Deploy to Base Sepolia

- [ ] **1.1** Run `forge test --match-path test/v2/*` — confirm V2 tests pass before deploying
- [x] **1.2** ~~Write `contracts/script/DeployV2.s.sol`~~ — done, see `contracts/script/DeployV2.s.sol`
- [ ] **1.3** Get Base Sepolia test USDC → https://faucet.circle.com/ (mint to admin wallet)
- [ ] **1.4** Run from `contracts/` dir:
  ```
  forge script script/DeployV2.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
  ```
- [ ] **1.5** Copy deployed `MarketFactoryV2` address — you'll need it in steps 2.1 and 3.1
- [ ] **1.6** Deploy mock ERC-20 + Uniswap V3 pool — script is ready at `contracts/script/DeployMockToken.s.sol`:
  ```
  forge script script/DeployMockToken.s.sol --rpc-url https://sepolia.base.org --broadcast
  ```
  Script logs `tokenAddress`, `poolAddress`, and `token0IsQuote` — save these for step 2.3

---

## Phase 2 — API: Configure & Run Locally

- [ ] **2.1** Copy `api/.env.example` → `api/.env`, fill in:
  - `FACTORY_ADDRESS` = deployed address from step 1.5
  - `ADMIN_PRIVATE_KEY` = your admin wallet private key
  - `RPC_URL` = `https://sepolia.base.org`
- [ ] **2.2** `cd api && npm install && npm run dev` — confirm it starts, hits `/health`
- [ ] **2.3** Smoke test: `POST /api/admin/markets` with your mock token address → market created on-chain
- [ ] **2.4** Confirm auto-resolver logs appear every 10s

---

## Phase 3 — Frontend: Wire to Real API

> Work in this exact order — TypeScript will flag broken usages as you go.

- [ ] **3.1** Set `NEXT_PUBLIC_API_URL` in `front/.env.local` to `http://localhost:8080`
- [ ] **3.2** `lib/api.ts` — add missing endpoints: `buildClaim`, `buildApprove`, `tokens.trending()`, `tokens.get(address)`; fix `admin.createMarket` body `{ tokenAddress, initialLiquidity }`; fix `admin.resolveMarket` (no `yesWins` param)
- [ ] **3.3** `lib/utils.ts` — add `bpsToFloat(bps: string): number` helper (`parseInt(bps) / 10000`)
- [ ] **3.4** `app/page.tsx` — replace `mockMarkets` with `api.markets.list()` (useEffect + useState + skeleton)
- [ ] **3.5** `components/market-card.tsx` — use `bpsToFloat(market.yesPrice)`, show `tokenImg` + `tokenSymbol`, drop `totalVolume`
- [ ] **3.6** `app/market/[address]/page.tsx` — replace `mockMarkets.find()` with `api.markets.get(address)`, add 10s auto-refresh
- [ ] **3.7** `hooks/useTx.ts` — create shared hook: call API for TxData → `useSendTransaction` → pending/success/error toast
- [ ] **3.8** `components/trade-panel.tsx` — wire Buy (approve USDC → buildBuy) and Sell (buildSell) using `useTx`
- [ ] **3.9** `components/claim-panel.tsx` — remove amount input, wire `buildClaim` → `useTx`
- [ ] **3.10** `components/mint-redeem-panel.tsx` — wire `buildMint` (approve first) and `buildRedeem` using `useTx`
- [ ] **3.11** `components/liquidity-panel.tsx` — wire `buildAdd` (approve first) and `buildRemove`, fetch real LP balance from `api.user.getPositions`
- [ ] **3.12** `app/portfolio/page.tsx` — replace mocks with `api.user.getPositions()` + `api.user.getClaimable()`
- [ ] **3.13** `app/admin/page.tsx` — rewrite: token picker from `api.tokens.trending()`, single "Trigger Resolve" button (no YES/NO), wire to `api.admin.createMarket({ tokenAddress, initialLiquidity })`
- [ ] **3.14** Delete `lib/mock-data.ts` — grep for remaining `mock` imports and remove

---

## Phase 4 — E2E Test (local, Base Sepolia)

- [ ] **4.1** Admin: pick mock token → create market → confirm market appears on homepage
- [ ] **4.2** User wallet: connect → buy YES → confirm TX on-chain
- [ ] **4.3** Wait for `resolutionTime` (or set a short window) → confirm auto-resolver fires
- [ ] **4.4** User: go to portfolio → claim winnings → confirm USDC received

---

## Phase 5 — Deploy

- [ ] **5.1** **Frontend → Vercel**: `cd front && vercel --prod`, set `NEXT_PUBLIC_API_URL` env var to Render URL
- [ ] **5.2** **API → Render**:
  - Connect GitHub repo, set root to `api/`
  - Build command: `npm install && npm run build`
  - Start command: `npm start`
  - Add all env vars from `api/.env` in Render dashboard
  - Note: SQLite file is ephemeral on Render free tier — markets reset on redeploy (fine for hackathon)
- [ ] **5.3** Update `NEXT_PUBLIC_API_URL` in Vercel to point at live Render URL
- [ ] **5.4** Full E2E smoke test on live URLs

---

## Phase 6 — Farcaster MiniApp (stretch, do last)

- [ ] **6.1** Scaffold a minimal Farcaster Frame that shows the active market list
- [ ] **6.2** Add a "Buy YES / Buy NO" action that deep-links to the market page
- [ ] **6.3** Register frame URL with Warpcast

---

## Dropped / Post-Hackathon

- ~~Move API to Next.js~~ — resolver needs a persistent process, keep Express on Render
- ~~Bonding curve~~ — CPMM works, not worth rewriting mid-hackathon
