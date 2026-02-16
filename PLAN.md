# Horus - Onchain Prediction Market

## Context
Fully onchain prediction market for ETHDenver Buidlathon 2026. Deployed on Base, USDC collateral, binary YES/NO markets with admin resolution. Go backend as middleware between frontend and chain.

**Key decisions:**
- Custom ERC-20 YES/NO tokens (not Gnosis CTF) with `1 YES + 1 NO = 1 USDC` invariant
- Built-in CPMM for price discovery
- Open LP: creator seeds pool, anyone can add/remove liquidity
- Instant admin resolution + auto-resolution via Go backend polling external APIs
- Non-custodial: Go handles reads/tx-prep/admin, frontend signs user txs via wallet
- Full Next.js frontend interfaced with Go backend

---

## System Architecture

```
┌──────────────┐     REST API      ┌──────────────────┐    JSON-RPC     ┌─────────────┐
│   Frontend   │ ◄──────────────► │   Go Backend     │ ◄────────────► │  Base Chain  │
│   (Next.js)  │                  │                  │                │             │
│              │   User signs tx  │  - Event indexer │                │  Contracts: │
│  wagmi/viem  │ ──────────────► │  - REST API      │  Admin tx      │  - Factory  │
│  RainbowKit  │   via wallet     │  - TX builder    │ ──────────────►│  - Markets  │
│              │                  │  - Auto-resolver │                │  - Tokens   │
└──────────────┘                  └──────────────────┘                └─────────────┘
```

---

## Smart Contracts (Foundry, Solidity 0.8.x)

```
contracts/
  OutcomeToken.sol        -- ERC-20 with onlyMarket mint/burn (~30 lines)
  PredictionMarket.sol    -- Core market logic + CPMM pool (~300 lines)
  MarketFactory.sol       -- Deploys markets, admin management (~100 lines)
```

### OutcomeToken.sol
- Minimal ERC-20 (extend OpenZeppelin)
- `mint(address to, uint256 amount)` -- onlyMarket modifier
- `burn(address from, uint256 amount)` -- onlyMarket modifier
- Immutable `market` address set in constructor

### PredictionMarket.sol

**State:**
- `yesToken`, `noToken` (deployed in constructor)
- `usdc` address (immutable)
- `yesReserve`, `noReserve` (CPMM pool)
- `totalLpSupply` + `lpBalances` mapping
- `resolved`, `yesWins` (resolution state)
- `admin`, `question`, `resolutionTime`

**Functions:**

| Function | Description |
|----------|-------------|
| `mint(uint256 usdcAmount)` | Deposit USDC, receive equal YES + NO tokens |
| `redeem(uint256 amount)` | Burn equal YES + NO, get USDC back |
| `buy(bool buyYes, uint256 usdcAmount)` | Mint pair internally, swap unwanted side via CPMM |
| `sell(bool sellYes, uint256 tokenAmount)` | Swap via CPMM, burn pair, return USDC |
| `addLiquidity(uint256 usdcAmount)` | Mint YES+NO, add to pool, issue LP shares |
| `removeLiquidity(uint256 lpAmount)` | Remove from pool, burn pairs, return USDC + excess tokens |
| `resolve(bool _yesWins)` | Admin only. Sets winning outcome. |
| `claim()` | Post-resolution: burn winning tokens for USDC (1:1) |

**CPMM Math:**
```
Invariant: yesReserve * noReserve = k
Price of YES = noReserve / (yesReserve + noReserve)
Fee: 2% on swaps (accrues to LPs)

buy(YES, amountIn):
  1. Mint amountIn YES + amountIn NO from USDC
  2. Swap NO into pool: yesOut = yesReserve - (k / (noReserve + noIn * 0.98))
  3. User receives: amountIn YES + yesOut YES
```

### MarketFactory.sol
- `createMarket(string question, uint256 resolutionTime, uint256 initialLiquidity)`
- `markets[]` array for enumeration
- Admin role management
- `MarketCreated` event

### Events
```solidity
event MarketCreated(address indexed market, string question, uint256 resolutionTime);
event Buy(address indexed user, bool indexed buyYes, uint256 usdcIn, uint256 tokensOut);
event Sell(address indexed user, bool indexed sellYes, uint256 tokensIn, uint256 usdcOut);
event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 lpShares);
event LiquidityRemoved(address indexed provider, uint256 lpShares);
event MarketResolved(address indexed market, bool yesWins);
event Claimed(address indexed user, uint256 usdcAmount);
```

---

## Go Backend

### Tech Stack
- Go 1.22+
- `go-ethereum` (geth) for contract bindings + event subscription
- `abigen` to generate Go bindings from contract ABIs
- Chi or Gin for HTTP router
- PostgreSQL for indexed event data (or SQLite for hackathon simplicity)

### Project Structure
```
backend/
  cmd/server/main.go          -- Entry point
  internal/
    api/
      router.go               -- REST routes
      handlers/
        markets.go            -- Market CRUD + list endpoints
        trade.go              -- TX preparation endpoints
        admin.go              -- Admin endpoints
    contracts/
      bindings/               -- abigen-generated Go bindings
      client.go               -- Ethereum client wrapper
    indexer/
      indexer.go              -- Event listener + DB writer
      resolver.go             -- Auto-resolution service (polls external APIs)
    models/
      market.go               -- Market data model
      position.go             -- User position model
    db/
      db.go                   -- Database connection + queries
      migrations/             -- SQL migrations
```

### REST API Endpoints

**Markets:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | List all markets (with prices, status) |
| GET | `/api/markets/:address` | Get market details |
| GET | `/api/markets/:address/price` | Get current YES/NO prices |

**Trading (returns unsigned tx data for frontend to sign):**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/markets/:address/buy` | Build buy tx (body: `{buyYes, amount, sender}`) |
| POST | `/api/markets/:address/sell` | Build sell tx (body: `{sellYes, amount, sender}`) |
| POST | `/api/markets/:address/mint` | Build mint tx |
| POST | `/api/markets/:address/redeem` | Build redeem tx |

**Liquidity:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/markets/:address/liquidity/add` | Build addLiquidity tx |
| POST | `/api/markets/:address/liquidity/remove` | Build removeLiquidity tx |

**User:**
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/:address/positions` | User's YES/NO/LP balances across markets |
| GET | `/api/users/:address/claimable` | Claimable winnings on resolved markets |

**Admin:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/markets` | Create new market (admin key signs + sends) |
| POST | `/api/admin/markets/:address/resolve` | Manually resolve market |

### Event Indexer
- Subscribes to contract events via WebSocket or polls via `FilterLogs`
- Stores in DB: markets, trades, liquidity events, resolutions
- Provides fast reads without hitting RPC for every query

### Auto-Resolver Service
- Background goroutine that checks markets approaching `resolutionTime`
- Polls configured external APIs (sports scores, election results, etc.)
- When result is available: calls `resolve()` on-chain using admin private key
- Configurable per market: `{apiUrl, resultPath, yesCondition}`

### TX Builder Pattern
The backend prepares unsigned transaction calldata:
```go
// Example: build a buy transaction
func BuildBuyTx(marketAddr, sender common.Address, buyYes bool, amount *big.Int) ([]byte, error) {
    abi, _ := PredictionMarketMetaData.GetAbi()
    calldata, _ := abi.Pack("buy", buyYes, amount)
    return calldata, nil // Frontend sends this via wallet
}
```

Frontend receives `{to, data, value}` and sends via wagmi's `sendTransaction`.

---

## Frontend (Next.js)

### Tech Stack
- Next.js 14 (App Router)
- wagmi v2 + viem for wallet + tx signing
- RainbowKit for wallet connection UI
- Tailwind CSS
- Axios/fetch for Go backend API calls

### Pages

| Page | Description |
|------|-------------|
| `/` | Market list -- cards with question, YES/NO prices, volume |
| `/market/[address]` | Trade page -- buy/sell panel, price display, LP panel, market info |
| `/admin` | Create markets, resolve markets, view auto-resolver status |
| `/portfolio` | User positions, claimable winnings, LP positions |

### Data Flow
```
1. Frontend fetches market data from Go API (GET /api/markets)
2. User clicks "Buy YES for 10 USDC"
3. Frontend calls Go API (POST /api/markets/:addr/buy) -> receives unsigned tx data
4. Frontend prompts wallet to sign + send tx via wagmi
5. Go indexer picks up Buy event -> updates DB
6. Frontend polls or refetches market data
```

---

## USDC Notes
- Base address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 6 decimals -- all math must account for this
- Use `SafeERC20` for all transfers
- Frontend must handle USDC approval before first trade (or use `permit`)

---

## Implementation Order

### Phase 1: Smart Contracts -- DONE
1. [x] `forge init` + install OpenZeppelin
2. [x] Implement `OutcomeToken.sol`
3. [x] Implement `PredictionMarket.sol` (mint, redeem, CPMM, LP, resolve, claim)
4. [x] Implement `MarketFactory.sol`
5. [x] Foundry tests with mock USDC (6 decimals) -- 26/26 passing

### Phase 2: Go Backend
1. Initialize Go module, install dependencies (go-ethereum, chi/gin)
2. Generate contract bindings with `abigen`
3. Implement event indexer
4. Implement REST API (market reads, tx builders)
5. Implement auto-resolver service
6. Set up DB (SQLite for speed)

### Phase 3: Frontend
1. Scaffold Next.js + wagmi + RainbowKit + Tailwind
2. API client layer (calls Go backend)
3. Market list page
4. Market detail + trade page
5. Admin panel
6. Portfolio page

### Phase 4: Integration + Deploy
1. Deploy contracts to Base Sepolia
2. Point Go backend at Base Sepolia RPC
3. E2E test: create market -> trade -> resolve -> claim
4. Deploy frontend (Vercel) + backend (Railway/Fly.io)

---

## Verification
1. **Foundry tests:** mint/redeem invariant, buy/sell, LP math, resolution, claims, edge cases
2. **Go backend tests:** API endpoint tests, indexer tests with mock events
3. **Integration:** full lifecycle on Base Sepolia
4. **Frontend E2E:** connect wallet -> browse -> trade -> claim
