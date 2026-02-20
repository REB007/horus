# Horus API — Test Checklist

All tests are covered by `scripts/test.ts`. Run with:
```bash
npx ts-node scripts/test.ts
```

## T1 — Health
- [ ] `GET /health` returns `{ status: "ok" }`

## T2 — Create Market (Admin)
- [ ] `POST /api/admin/markets` with mock token address creates a market on-chain
- [ ] Response contains `marketAddress`, `question`, `resolutionTime`, `txHash`
- [ ] Market appears in DB (verified via `GET /api/markets`)

## T3 — List Markets
- [ ] `GET /api/markets` returns array with the created market
- [ ] Market has `yesPrice`, `noPrice`, `snapshotTick`, `currentTick`, `resolved: false`

## T4 — Get Single Market
- [ ] `GET /api/markets/:address` returns full market detail
- [ ] Includes `yesTokenAddress`, `noTokenAddress`

## T5 — Get Price
- [ ] `GET /api/markets/:address/price` returns `yesPrice` and `noPrice` as strings
- [ ] `yesPrice + noPrice == 10000` (BPS, sums to 100%)

## T6 — TX Builder: Approve
- [ ] `POST /api/markets/:address/approve` with `amount` returns valid tx calldata
- [ ] `to` is USDC address, `data` is non-empty

## T7 — TX Builder: Buy
- [ ] `POST /api/markets/:address/buy` with `{ buyYes: true, amount }` returns tx calldata
- [ ] `POST /api/markets/:address/buy` with `{ buyYes: false, amount }` returns tx calldata

## T8 — TX Builder: Sell
- [ ] `POST /api/markets/:address/sell` with `{ sellYes: true, amount }` returns tx calldata

## T9 — TX Builder: Mint / Redeem
- [ ] `POST /api/markets/:address/mint` returns tx calldata
- [ ] `POST /api/markets/:address/redeem` returns tx calldata

## T10 — TX Builder: Claim
- [ ] `POST /api/markets/:address/claim` returns tx calldata

## T11 — User Positions
- [ ] `GET /api/users/:address/positions` returns empty array for fresh wallet

## T12 — User Claimable
- [ ] `GET /api/users/:address/claimable` returns empty array before resolution

## T13 — Manual Resolve (Admin)
- [ ] `POST /api/admin/markets/:address/resolve` resolves the market on-chain
- [ ] Response contains `yesWins` boolean and `txHash`
- [ ] `GET /api/markets/:address` now shows `resolved: true`

## T14 — Tokens Endpoint
- [ ] `GET /api/tokens` returns list of Clanker tokens (or graceful error if API is down)
