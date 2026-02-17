# Horus Frontend

Next.js 14 frontend for the Horus onchain prediction market platform.

## Architecture

### Tech Stack

- **Next.js 14** (App Router) — React framework with server components
- **TypeScript** — Type safety across the application
- **Tailwind CSS** — Utility-first styling
- **wagmi v2** — React hooks for Ethereum interactions
- **viem** — TypeScript Ethereum library (modern ethers.js alternative)
- **RainbowKit** — Wallet connection UI (MetaMask, Rabby, WalletConnect, etc.)
- **TanStack Query** — Server state management, caching, auto-refetch
- **Lucide React** — Modern icon library
- **react-hot-toast** — Toast notifications

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                     │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   UI Layer   │───▶│  API Client  │───▶│ Go Backend   │ │
│  │  (Components)│    │  (lib/api.ts)│    │  REST API    │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                                         │         │
│         │                                         │         │
│  ┌──────▼──────┐                         ┌───────▼──────┐ │
│  │   wagmi +   │                         │ Event Indexer│ │
│  │  RainbowKit │                         │   (Postgres) │ │
│  └──────┬──────┘                         └──────────────┘ │
│         │                                                  │
└─────────┼──────────────────────────────────────────────────┘
          │ User signs txs
          │ via wallet
          ▼
   ┌─────────────┐
   │ Base Chain  │
   │  Contracts  │
   └─────────────┘
```

### Non-Custodial Design

- **Frontend** fetches market data from Go backend (read-only API calls)
- **User actions** (buy, sell, add liquidity, claim) trigger:
  1. Frontend calls Go API to build unsigned transaction data
  2. Go returns `{to, data, value}`
  3. Frontend prompts user's wallet to sign & broadcast
  4. User maintains full custody — frontend never holds keys

### Project Structure

```
front/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Homepage (market list)
│   ├── providers.tsx        # Wagmi + Query + RainbowKit setup
│   ├── market/
│   │   └── [address]/       # Market detail & trading page
│   ├── portfolio/           # User positions & claimable winnings
│   └── admin/               # Admin panel (create/resolve markets)
│
├── components/              # Reusable React components
│   ├── header.tsx          # Nav + wallet connect button
│   ├── market-card.tsx     # Market preview card (for list)
│   ├── trade-panel.tsx     # Buy/sell interface
│   └── ...
│
├── lib/                     # Core utilities & config
│   ├── api.ts              # Typed API client for Go backend
│   ├── wagmi.ts            # Wagmi config (chains, transports)
│   ├── config.ts           # Environment variables
│   └── utils.ts            # Helper functions (formatUSDC, cn, etc.)
│
├── types/                   # TypeScript type definitions
│   └── market.ts           # Market, Price, Position, TxData types
│
└── .env.local              # Environment config
```

### Key Files

#### `lib/api.ts`
Typed API client wrapping all Go backend endpoints:
- `api.markets.list()` — GET /api/markets
- `api.trade.buildBuy()` — POST /api/markets/:address/buy
- `api.user.getPositions()` — GET /api/users/:address/positions
- etc.

#### `lib/wagmi.ts`
Wagmi configuration for Base + Base Sepolia chains with RainbowKit integration.

#### `app/providers.tsx`
Client-side providers wrapping the app:
- `WagmiProvider` — Ethereum context
- `QueryClientProvider` — TanStack Query cache
- `RainbowKitProvider` — Wallet UI
- `Toaster` — Toast notifications

#### `types/market.ts`
TypeScript interfaces matching Go backend response shapes:
- `Market` — market metadata, reserves, resolution state
- `MarketPrice` — current YES/NO prices
- `Position` — user's token balances per market
- `TxData` — unsigned transaction data from backend

### Data Flow Example

**User buys YES tokens:**

1. User enters "100 USDC" in buy panel, clicks "Buy YES"
2. Frontend calls `api.trade.buildBuy(marketAddr, true, "100", userAddr)`
3. Go backend returns `{to: "0x...", data: "0x..."}`
4. Frontend calls `wagmi.sendTransaction()` with tx data
5. RainbowKit prompts user's wallet (MetaMask/Rabby) to sign
6. User confirms → tx broadcasts to Base chain
7. Go indexer picks up `Buy` event → updates database
8. Frontend refetches market data → UI updates with new price

### Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080          # Go backend URL
NEXT_PUBLIC_CHAIN_ID=84532                         # Base Sepolia (or 8453 for mainnet)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...           # WalletConnect project ID
```

### Pages

| Route | Description |
|-------|-------------|
| `/` | Market list — cards with question, prices, volume |
| `/market/[address]` | Market detail — trade panel, LP panel, market info |
| `/portfolio` | User positions, claimable winnings, LP positions |
| `/admin` | Create markets, resolve markets (admin only) |

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Go backend running at `http://localhost:8080` (for API calls)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your values

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Progress Tracking

See `plan.yaml` for current sprint progress and story point breakdown.

## Integration with Go Backend

The frontend expects the following REST API endpoints from the Go backend:

**Markets:**
- `GET /api/markets` — list all markets
- `GET /api/markets/:address` — get market details
- `GET /api/markets/:address/price` — get current YES/NO prices

**Trading (returns unsigned tx data):**
- `POST /api/markets/:address/buy` — build buy transaction
- `POST /api/markets/:address/sell` — build sell transaction
- `POST /api/markets/:address/mint` — build mint transaction
- `POST /api/markets/:address/redeem` — build redeem transaction

**Liquidity:**
- `POST /api/markets/:address/liquidity/add` — build add liquidity tx
- `POST /api/markets/:address/liquidity/remove` — build remove liquidity tx

**User:**
- `GET /api/users/:address/positions` — user's token balances
- `GET /api/users/:address/claimable` — claimable winnings

**Admin:**
- `POST /api/admin/markets` — create new market
- `POST /api/admin/markets/:address/resolve` — resolve market

## USDC Handling

- Base Sepolia USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Mainnet USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 6 decimals — all amounts use `formatUSDC()` / `parseUSDC()` utilities
- Approval required before first trade (handled by `USDC approval handling` story)
