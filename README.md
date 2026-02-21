# Horus 🦅

**Fully on-chain prediction markets for memecoins — ETHDenver Buidlathon 2026**

> "Will $MEME be UP in 10 minutes?"

Horus creates short-duration binary prediction markets on Clanker memecoins. Prices are resolved trustlessly using Uniswap V3 on-chain price oracles — the smart contract reads the price itself, the admin cannot fabricate outcomes.

**Live on Ethereum Sepolia** · [Try it →](#getting-started)

---

## How It Works

1. A market is created for a memecoin: *"Will $TOKEN be UP in 10 min?"*
2. The contract snapshots the current Uniswap V3 tick (price) at creation
3. Users buy **YES** or **NO** tokens with USDC — prices reflect crowd probability
4. `1 YES + 1 NO = 1 USDC` — always fully collateralized
5. After 10 minutes, the contract reads the current Uniswap tick and compares it to the snapshot
6. Winners redeem their tokens for USDC at 1:1

---

## Architecture

```
┌──────────────┐     REST API      ┌──────────────────┐    JSON-RPC     ┌─────────────────┐
│   Frontend   │ ◄──────────────► │   TS Backend     │ ◄────────────► │ Ethereum Sepolia │
│   (Next.js)  │                  │   (Express)      │                │                 │
│              │   User signs tx  │  - TX builder    │  Admin tx      │  MarketFactory  │
│  wagmi/viem  │ ──────────────► │  - Auto-resolver │ ──────────────►│  Markets (CPMM) │
│  RainbowKit  │   via wallet     │  - Clanker proxy │                │  OutcomeTokens  │
│              │                  │  - SQLite cache  │                │  Uniswap V3     │
└──────────────┘                  └──────────────────┘                └─────────────────┘
```

### Resolution Flow (fully on-chain)

```
Market created → contract reads slot0().tick from Uniswap V3 pool → stores snapshotTick
         ↓
10 min later → admin calls resolve() → contract reads slot0().tick again → compares → resolves
         ↓
Admin triggers resolution, but CANNOT choose the outcome. The contract decides.
```

---

## Smart Contracts

Built with Foundry. Deployed on Ethereum Sepolia.

| Contract | Description |
|---|---|
| `PredictionMarketV2.sol` | Core market: CPMM pool, mint/redeem, buy/sell, LP, on-chain Uniswap V3 oracle, resolution, claims |
| `OutcomeToken.sol` | ERC-20 YES/NO tokens with restricted mint/burn (`onlyMarket`) |
| `MarketFactoryV2.sol` | Deploys markets, seeds initial liquidity, admin management |
| `IUniswapV3Pool.sol` | Minimal interface to read `slot0().tick` from any Uniswap V3 pool |

### Key Invariants

- **Full collateralization**: `1 YES + 1 NO = 1 USDC` — minting and redeeming are symmetric
- **CPMM pricing**: `yesReserve × noReserve = k` — prices reflect market probability
- **2% swap fee** accrues to liquidity providers
- **Trustless resolution**: the contract reads the Uniswap V3 tick on-chain — admin cannot fabricate the result

### Deployed Addresses (Ethereum Sepolia)

| Contract | Address |
|---|---|
| MarketFactoryV2 | `0x93ebd335231Ae3Ce4859BfD56A9351c11A55d822` |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Contracts** | Solidity 0.8.20, Foundry, OpenZeppelin |
| **Backend** | TypeScript, Express, viem, better-sqlite3 |
| **Frontend** | Next.js 16, React, wagmi v2, RainbowKit, TailwindCSS |
| **Oracle** | Uniswap V3 `slot0().tick` (on-chain) |
| **Chain** | Ethereum Sepolia (testnet) |
| **Collateral** | USDC (6 decimals) |

---

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 18+
- A wallet with Sepolia ETH + USDC ([faucet](https://faucet.circle.com/))

### 1. Contracts

```bash
cd contracts
forge build
forge test --match-path test/v2/* -v
```

### 2. Backend API

```bash
cd api
cp .env.example .env
# Fill in: FACTORY_ADDRESS, ADMIN_PRIVATE_KEY, RPC_URL
npm install
npm run dev
# API runs on http://localhost:8080
```

### 3. Frontend

```bash
cd front
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

---

## Scope & Current Limitations

### What's Built (MVP)

- ✅ Fully on-chain CPMM prediction markets with USDC collateral
- ✅ On-chain price oracle via Uniswap V3 tick comparison
- ✅ Admin-triggered resolution (contract reads price, admin can't lie)
- ✅ Auto-resolver cron (polls every 10s for expired markets)
- ✅ Full trading UI: buy/sell YES/NO, mint/redeem, add/remove liquidity, claim winnings
- ✅ Token discovery via Clanker API (trending memecoins)
- ✅ Wallet integration via RainbowKit + wagmi (MetaMask, WalletConnect, etc.)

### Current Trust Assumptions

| Component | Trust Level | Details |
|---|---|---|
| **Price outcome** | **Trustless** | Contract reads Uniswap V3 tick on-chain — admin cannot fabricate the result |
| **Resolution trigger** | **Admin-gated** | Only admin can call `resolve()` — but outcome is determined by the contract |
| **Market creation** | **Admin-gated** | Only admin can create markets (factory has `onlyAdmin` modifier) |
| **Collateral** | **Trustless** | USDC held by the market contract, fully collateralized at all times |
| **Backend** | **Convenience layer** | Builds unsigned TX data — user signs everything in their own wallet |

**The admin can delay resolution but cannot change the outcome.** This is a meaningful trust minimization compared to traditional prediction markets where the oracle operator chooses the result.

---

## Future Improvements

### 1. Trustless Resolution via zkTLS

The biggest remaining trust assumption is that the admin must trigger resolution. While the admin can't choose the outcome (the contract reads the price on-chain), they could theoretically delay or refuse to resolve.

**zkTLS** (e.g. [TLSNotary](https://tlsnotary.org/) or [Reclaim Protocol](https://reclaimprotocol.org/)) can eliminate this:

1. At resolution time, a zkTLS proof is generated against the Uniswap API price endpoint
2. The proof cryptographically attests: *"At timestamp T, the Uniswap API returned price X for token Y"*
3. A verifier contract on-chain checks the zkTLS proof and resolves the market — **no admin needed**
4. Anyone can submit the proof, making resolution fully permissionless and provably correct

This would make Horus **fully trustless end-to-end**: market creation, trading, price discovery, and resolution — all verifiable on-chain or via cryptographic proofs.

### 2. Permissionless Market Creation

Currently `createMarket` is admin-only on the factory contract. Future versions would:
- Remove the `onlyAdmin` modifier — anyone can create a market by providing USDC liquidity
- Add a minimum liquidity threshold to prevent spam
- Let the creator earn a small fee from trading volume

### 3. Dynamic Pricing via Uniswap V4 Hooks

Uniswap V4 hooks could allow the prediction market AMM to react to real-time Uniswap pool events:
- Adjust YES/NO prices dynamically based on the underlying token's price movement
- Prevent stale markets where the price has already moved significantly
- Create a tighter coupling between the prediction market and the actual price feed

### 4. Uniswap API Integration

Integrate the [Uniswap Developer API](https://api-docs.uniswap.org/) for:
- Richer price data (TWAP, historical prices) for the oracle
- Swap execution — let users swap any token → USDC directly in the trading UI before placing bets
- Better token discovery and pool metadata

### 5. Farcaster MiniApp

Embed Horus as a Farcaster Frame:
- Browse active markets directly in Warpcast
- One-tap "Buy YES" / "Buy NO" actions
- Social sharing of positions and outcomes

---

## Project Structure

```
horus/
├── contracts/          # Foundry — Solidity smart contracts
│   ├── src/v2/         # V2 contracts (with Uniswap oracle)
│   ├── test/v2/        # V2 tests
│   └── script/         # Deploy scripts
├── api/                # Express backend — TX builder, auto-resolver, Clanker proxy
│   └── src/
│       ├── routes/     # REST endpoints (markets, trade, liquidity, admin)
│       ├── services/   # Chain client, Clanker API, resolver cron
│       └── db/         # SQLite for market metadata
└── front/              # Next.js frontend
    ├── app/            # Pages (home, market detail, portfolio, admin)
    ├── components/     # Trade, mint/redeem, claim, liquidity panels
    └── lib/            # API client, wagmi config, utils
```

---

## Team

Built at ETHDenver 2026.

## License

MIT
