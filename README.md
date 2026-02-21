# Horus 🦅

**Multi-chain prediction markets for any token with a Uniswap pool — ETHDenver 2026**

> "Will $WETH be UP in 10 minutes?"

Horus creates short-duration binary prediction markets on **any token, on any chain** that has Uniswap liquidity. Prices are fetched via the [Uniswap Developer API](https://api-docs.uniswap.org/) and stored on-chain as auditable oracle metadata — laying the foundation for fully trustless resolution via zkTLS.

**Live on Ethereum Sepolia** · [Try it →](#getting-started)

---

## How It Works

1. Pick any token on any Uniswap-supported chain (Ethereum, Base, etc.)
2. A market is created: *"Will $TOKEN be UP in 10 min?"*
3. The API fetches the current price from the **Uniswap Price API** and submits it as the `snapshotPrice`
4. Oracle metadata is stored on-chain: `oracleEndpoint`, `sourceChainId`, `sourcePool`, `sourceToken`
5. Users buy **YES** or **NO** tokens with USDC — prices reflect crowd probability
6. `1 YES + 1 NO = 1 USDC` — always fully collateralized
7. After 10 minutes, the API fetches the resolution price from Uniswap and calls `resolve(price)`
8. Contract compares: `resolutionPrice > snapshotPrice` → **YES wins**
9. Winners redeem their tokens for USDC at 1:1

---

## Architecture

```
┌──────────────┐     REST API      ┌──────────────────┐    JSON-RPC     ┌─────────────────┐
│   Frontend   │ ◄──────────────► │   TS Backend     │ ◄────────────► │ Ethereum Sepolia │
│   (Next.js)  │                  │   (Express)      │                │                 │
│              │   User signs tx  │  - TX builder    │  Admin tx      │  MarketFactoryV3│
│  wagmi/viem  │ ──────────────► │  - Auto-resolver │ ──────────────►│  Markets (CPMM) │
│  RainbowKit  │   via wallet     │  - Uniswap API   │                │  OutcomeTokens  │
│              │                  │  - Clanker proxy │                │  Oracle metadata│
│              │   Share to       │  - SQLite cache  │                │                 │
│              │   Farcaster      │                  │  Uniswap API   │                 │
└──────────────┘                  └──────────────────┘ ◄────────────► └─────────────────┘
                                    Price fetch from     (any chain)
                                    Ethereum, Base, etc.
```

### Resolution Flow

```
Market created → API fetches price from Uniswap API → snapshotPrice stored on-chain
                 + oracle metadata (endpoint, chainId, pool, token) stored on-chain
         ↓
10 min later → auto-resolver fetches resolution price from Uniswap API
             → calls resolve(resolutionPrice) on-chain
             → contract compares: resolutionPrice > snapshotPrice → YES wins
         ↓
Oracle metadata on-chain = anyone can audit the data source.
Future: zkTLS proof can verify the API response → fully trustless resolution.
```

---

## Smart Contracts (V3)

Built with Foundry. Deployed on Ethereum Sepolia. 12/12 tests passing.

| Contract | Description |
|---|---|
| `PredictionMarket_v3.sol` | Core market: CPMM pool, mint/redeem, buy/sell, LP, submitted price oracle, resolution, claims. Oracle metadata stored on-chain. |
| `OutcomeToken.sol` | ERC-20 YES/NO tokens with restricted mint/burn (`onlyMarket`) |
| `MarketFactory_v3.sol` | **Permissionless** market creation (anyone with ≥10 USDC), seeds liquidity, stores oracle params |

### Key Invariants

- **Full collateralization**: `1 YES + 1 NO = 1 USDC` — minting and redeeming are symmetric
- **CPMM pricing**: `yesReserve × noReserve = k` — prices reflect market probability
- **2% swap fee** accrues to liquidity providers
- **Multi-chain oracle**: token can be on any chain — price fetched via Uniswap API, not on-chain pool reads
- **Auditable**: oracle metadata on-chain proves exactly which data source was used

### Oracle Metadata (stored on-chain per market)

```solidity
string public oracleEndpoint;    // "https://api.uniswap.org/v2/quote"
uint256 public sourceChainId;    // 1 = Ethereum, 8453 = Base, etc.
address public sourcePool;       // Uniswap pool on source chain
address public sourceToken;      // token address on source chain
int256 public snapshotPrice;     // price at creation (18 decimals)
int256 public resolutionPrice;   // price at resolution (18 decimals)
```

This metadata is the foundation for future trustless resolution — a zkTLS verifier can check that the Uniswap API actually returned these prices.

### Deployed Addresses (Ethereum Sepolia)

| Contract | Address |
|---|---|
| MarketFactoryV3 | `0x4759219b2eb34d8645391E6Bd12B15E35b4e1866` |
| USDC | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

---

## Uniswap API Integration

Horus integrates the [Uniswap Developer API](https://api-docs.uniswap.org/) as its price oracle:

- **Snapshot price**: fetched at market creation via `POST /v1/quote` (token → USDC)
- **Resolution price**: fetched at resolution time via the same endpoint
- **Multi-hop routing**: if no direct token/USDC pool exists, routes through WETH automatically
- **Multi-chain**: supports Ethereum (chainId 1), Base (8453), and any chain Uniswap covers
- **Price check endpoint**: `GET /api/admin/price-check/:chainId/:tokenAddress` — verifies a token is priceable before market creation

The Uniswap API is the **sole price source** for both creation and resolution, making it central to the protocol's operation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Contracts** | Solidity 0.8.20, Foundry, OpenZeppelin |
| **Backend** | TypeScript, Express, viem, better-sqlite3 |
| **Frontend** | Next.js, React, wagmi v2, RainbowKit, TailwindCSS |
| **Oracle** | [Uniswap Developer API](https://api-docs.uniswap.org/) (`/v1/quote`) |
| **Token Discovery** | [Clanker API](https://www.clanker.world/) (trending memecoins) |
| **Chain** | Ethereum Sepolia (testnet) — markets for tokens on any chain |
| **Collateral** | USDC (6 decimals) |
| **Social** | Farcaster share (Warpcast deep-link) |

---

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 18+
- A wallet with Sepolia ETH + USDC ([faucet](https://faucet.circle.com/))
- [Uniswap API key](https://developers.uniswap.org/dashboard) (free)

### 1. Contracts

```bash
cd contracts
forge build
forge test --match-path test/v3/* -v   # 12/12 tests
```

### 2. Backend API

```bash
cd api
cp .env.example .env
# Fill in: ADMIN_PRIVATE_KEY, RPC_URL, UNISWAP_API_KEY
# FACTORY_ADDRESS is pre-filled for Sepolia
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

### 4. Integration Test

```bash
cd api
npm test   # Runs 15 end-to-end tests against the running API
```

---

## Scope — What's Built

- ✅ Fully on-chain CPMM prediction markets with USDC collateral
- ✅ **Multi-chain oracle** — bet on tokens from any chain with Uniswap liquidity
- ✅ **Uniswap Developer API** integration for price fetching (snapshot + resolution)
- ✅ **Permissionless market creation** — anyone with ≥10 USDC can create a market
- ✅ Oracle metadata stored on-chain (endpoint, chainId, pool, token, prices)
- ✅ Auto-resolver cron (polls every 10s, fetches price, resolves on-chain)
- ✅ Full trading UI: buy/sell YES/NO, mint/redeem, add/remove liquidity, claim winnings
- ✅ Token discovery via Clanker API (trending memecoins)
- ✅ Wallet integration via RainbowKit + wagmi (MetaMask, WalletConnect, etc.)
- ✅ Farcaster share button (deep-link to Warpcast)
- ✅ Price check endpoint — verify a token is priceable before creating a market

### Current Trust Model

| Component | Trust Level | Details |
|---|---|---|
| **Price data** | **Auditable** | Oracle metadata on-chain proves the data source. Anyone can verify the Uniswap API returns the same price. |
| **Resolution** | **Admin-triggered** | Admin calls `resolve(price)` with the Uniswap API price. Admin chooses *when* to resolve but the price comes from Uniswap. |
| **Market creation** | **Permissionless** | Anyone can create a market — no admin approval needed |
| **Collateral** | **Trustless** | USDC held by the market contract, fully collateralized at all times |
| **Backend** | **Convenience layer** | Builds unsigned TX data — user signs everything in their own wallet |

**The admin submits the price but cannot fabricate it** — oracle metadata on-chain proves exactly which API endpoint, chain, and token were used. Anyone can independently query the same endpoint to verify.

---

## The Path to Trustlessness

Horus is designed with a clear upgrade path from admin-resolved to fully trustless:

```
V1: Admin picks outcome (bool)           ← fully trusted
V2: Admin triggers, contract reads price  ← same-chain only, admin can delay
V3: Admin submits price, metadata on-chain ← multi-chain, auditable     ← WE ARE HERE
V4: zkTLS proof verifies price            ← fully trustless             ← NEXT
```

### What V3 Enables (today)

The oracle metadata stored on-chain (`oracleEndpoint`, `sourceChainId`, `sourcePool`, `sourceToken`) is not just documentation — it's the **input specification** for a future zkTLS verifier. When a verifier contract is deployed, it knows exactly:
- Which API endpoint to verify the TLS response from
- Which chain and token the price should be for
- What timestamp the price must be from

### Future Upgrades

#### 1. zkTLS Trustless Resolution

**zkTLS** (e.g. [TLSNotary](https://tlsnotary.org/) or [Reclaim Protocol](https://reclaimprotocol.org/)) eliminates the admin from resolution:

1. After the market expires, anyone generates a zkTLS proof against the Uniswap API
2. The proof cryptographically attests: *"At timestamp T, the Uniswap API returned price X for token Y on chain Z"*
3. A `resolveWithProof(price, proof)` function on-chain verifies the proof against the stored oracle metadata
4. Market resolves — **no admin needed, fully permissionless**

The contract already stores everything needed. Only the verifier contract and the `resolveWithProof` function need to be added.

#### 2. Emergency Fallback

A `resolveEmergency()` function callable by anyone after 24 hours if the admin disappears and no zkTLS verifier exists. Defaults to NO wins (conservative — "price didn't go up"). Prevents funds from being locked forever.

#### 3. Dispute Mechanism

A challenge window after admin resolution where anyone can override the result with a zkTLS proof. If the admin submitted a wrong price, the proof corrects it.

#### 4. TWAP Oracle

Use time-weighted average price instead of spot price to prevent flash-loan or sandwich manipulation of the resolution price.

#### 5. Dynamic Pricing via Uniswap V4 Hooks

Uniswap V4 hooks could let the prediction market AMM react to real-time price movements:
- Adjust YES/NO prices based on the underlying token's price trajectory
- Prevent stale markets where the outcome is already obvious

#### 6. Creator Fees

Small % of trading volume goes to the market creator as incentive for permissionless market creation.

#### 7. Farcaster MiniApp

Full Farcaster Frame integration:
- Browse active markets directly in Warpcast
- One-tap "Buy YES" / "Buy NO" actions
- Social sharing of positions and outcomes

---

## Project Structure

```
horus/
├── contracts/              # Foundry — Solidity smart contracts
│   ├── src/v1/             # V1 contracts (admin-picked outcome)
│   ├── src/v2/             # V2 contracts (on-chain Uniswap oracle)
│   ├── src/v3/             # V3 contracts (submitted price + oracle metadata)
│   ├── test/v3/            # V3 tests (12/12 passing)
│   ├── script/             # Deploy scripts
│   ├── PLAN_V3.md          # Detailed V3 upgrade plan
│   └── planv3.yaml         # Sprint file (epics, stories, status)
├── api/                    # Express backend
│   └── src/
│       ├── routes/         # REST endpoints (markets, trade, liquidity, admin)
│       ├── services/       # Chain client, Uniswap API, Clanker, resolver
│       │   └── uniswap.ts  # Uniswap Developer API integration
│       └── db/             # SQLite for market metadata
└── front/                  # Next.js frontend
    ├── app/                # Pages (home, market detail, portfolio, admin, create)
    ├── components/         # Trade, mint/redeem, claim, liquidity, share panels
    └── lib/                # API client, wagmi config, Farcaster utils
```

---

## Team

Built at ETHDenver 2026.

## License

MIT
