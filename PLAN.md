# Horus - Onchain Prediction Market

## Context
Fully onchain prediction market for ETHDenver Buidlathon 2026. Deployed on Base, USDC collateral, 10-minute Up/Down markets on Clanker memecoins with on-chain price resolution via Uniswap V3. TS backend as convenience layer.

**Key decisions:**
- Custom ERC-20 YES/NO tokens (not Gnosis CTF) with `1 YES + 1 NO = 1 USDC` invariant
- Built-in CPMM for price discovery
- Open LP: creator seeds pool, anyone can add/remove liquidity
- **On-chain price oracle**: reads Uniswap V3 `slot0().tick` at market creation (snapshot) and resolution
- **Admin-only resolve**: admin calls `resolve()` which reads price on-chain — admin can't lie, contract does the comparison
- **10-minute markets** on Clanker memecoins: "Will $TOKEN be UP in 10 min?"
- Non-custodial: TS backend handles reads/tx-prep/admin, frontend signs user txs via wallet
- Full Next.js frontend interfaced with TS backend
- Token discovery via Clanker.world API

---

## System Architecture

```
┌──────────────┐     REST API      ┌──────────────────┐    JSON-RPC     ┌─────────────┐
│   Frontend   │ ◄──────────────► │   TS Backend     │ ◄────────────► │  Base Chain  │
│   (Next.js)  │                  │   (Express)      │                │             │
│              │   User signs tx  │  - REST API      │                │  Contracts: │
│  wagmi/viem  │ ──────────────► │  - TX builder    │  Admin tx      │  - Factory  │
│  RainbowKit  │   via wallet     │  - Auto-resolver │ ──────────────►│  - Markets  │
│              │                  │  - Clanker proxy │                │  - Tokens   │
└──────────────┘                  └──────────────────┘                │  - UniV3    │
                                                                     └─────────────┘

Resolution flow (on-chain):
  Factory creates market → reads slot0().tick from Uni V3 pool → stores snapshotTick
  10 min later → admin calls resolve() → contract reads slot0().tick → compares → resolves
```

---

## Smart Contracts (Foundry, Solidity 0.8.x)

```
contracts/
  OutcomeToken.sol        -- ERC-20 with onlyMarket mint/burn (~30 lines)
  PredictionMarket.sol    -- Core market logic + CPMM pool + on-chain price oracle (~350 lines)
  MarketFactory.sol       -- Deploys markets, admin management (~120 lines)
  interfaces/
    IUniswapV3Pool.sol    -- Minimal interface for slot0() (~10 lines)
```

### OutcomeToken.sol — DONE, no changes needed
- Minimal ERC-20 (extend OpenZeppelin)
- `mint(address to, uint256 amount)` -- onlyMarket modifier
- `burn(address from, uint256 amount)` -- onlyMarket modifier
- Immutable `market` address set in constructor

### IUniswapV3Pool.sol — NEW
```solidity
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}
```

### PredictionMarket.sol — UPDATED

**New state (added to existing):**
- `IUniswapV3Pool public pricePool` — Clanker token's Uniswap V3 pool
- `int24 public snapshotTick` — price tick at market creation
- `bool public token0IsQuote` — whether token0 is the quote asset (WETH)

**Updated constructor:**
```solidity
constructor(
    address _usdc,
    address _admin,
    string memory _question,
    uint256 _resolutionTime,
    address _pricePool,          // NEW
    bool _token0IsQuote          // NEW
)
```
Constructor reads `slot0().tick` from the pool and stores it as `snapshotTick`.

**Updated resolve — reads price on-chain:**
```solidity
function resolve() external onlyAdmin {
    require(!resolved, "already resolved");
    require(block.timestamp >= resolutionTime, "too early");

    (, int24 currentTick,,,,,) = pricePool.slot0();

    // If token0 is quote (WETH), tick DOWN = memecoin price UP
    bool priceUp = token0IsQuote
        ? currentTick < snapshotTick
        : currentTick > snapshotTick;

    resolved = true;
    yesWins = priceUp;
    emit MarketResolved(priceUp);
}
```
**Key: admin can call resolve(), but cannot choose the outcome.** The contract reads the price from Uniswap and decides.

**All other functions unchanged:** mint, redeem, buy, sell, addLiquidity, removeLiquidity, claim.

**CPMM Math (unchanged):**
```
Invariant: yesReserve * noReserve = k
Price of YES = noReserve / (yesReserve + noReserve)
Fee: 2% on swaps (accrues to LPs)
```

### MarketFactory.sol — UPDATED
```solidity
function createMarket(
    string calldata _question,
    uint256 _resolutionTime,
    uint256 _initialLiquidity,
    address _pricePool,          // NEW: Uniswap V3 pool for the memecoin
    bool _token0IsQuote          // NEW: token ordering in the pool
) external onlyAdmin returns (address)
```
- Passes `_pricePool` and `_token0IsQuote` to PredictionMarket constructor
- PredictionMarket snapshots the tick at creation time
- Everything else unchanged

### Events
```solidity
event MarketCreated(address indexed market, string question, uint256 resolutionTime, uint256 initialLiquidity);
event Buy(address indexed user, bool indexed buyYes, uint256 usdcIn, uint256 tokensOut);
event Sell(address indexed user, bool indexed sellYes, uint256 tokensIn, uint256 usdcOut);
event LiquidityAdded(address indexed provider, uint256 usdcAmount, uint256 lpShares);
event LiquidityRemoved(address indexed provider, uint256 lpShares, uint256 usdcOut, uint256 yesOut, uint256 noOut);
event MarketResolved(bool yesWins);
event Claimed(address indexed user, uint256 usdcAmount);
event Minted(address indexed user, uint256 usdcAmount);
event Redeemed(address indexed user, uint256 amount);
```

### Price Oracle Design (Option B)
- **Spot price** via `slot0().tick` — simple, no cardinality requirements
- **Admin-only resolve** — prevents flash loan attacks (attacker can't call resolve in same tx as manipulation)
- **Trustless outcome** — admin triggers resolution, but the contract reads the price itself. Admin cannot fabricate the result.
- **Post-hackathon upgrade**: add a grace period (`require(block.timestamp >= resolutionTime + 60)`) after which anyone can resolve, making it fully permissionless as a fallback.

---

## TypeScript Backend (Express + viem)

See `api/PLAN.md` for full backend plan.

### Key Points
- **TypeScript** — same ecosystem as frontend, no new toolchain
- **viem** — contract reads, ABI encoding, admin tx signing
- **No indexer** — reads on-chain data live via RPC
- **Auto-resolver** — polls for expired markets, calls `resolve()` on-chain (contract reads price itself)
- **Clanker API** — token discovery for trending memecoins
- **SQLite** — only stores market metadata (token info, creation time)

### Auto-Resolver (simplified with on-chain oracle)
```
Every 10 seconds:
  1. Query DB for unresolved markets past resolutionTime
  2. For each: call resolve() on-chain via admin key
     → Contract reads slot0().tick from Uniswap pool
     → Contract compares to snapshotTick
     → Contract sets yesWins
  3. Update DB: mark resolved
```
No DexScreener needed. No price comparison in the backend. The contract does all the math.

---

## Frontend (Next.js)

### Tech Stack
- Next.js 14 (App Router)
- wagmi v2 + viem for wallet + tx signing
- RainbowKit for wallet connection UI
- Tailwind CSS
- fetch for TS backend API calls

### Pages

| Page | Description |
|------|-------------|
| `/` | Market list -- cards with memecoin, YES/NO prices, countdown timer, volume |
| `/market/[address]` | Trade page -- buy/sell panel, price chart, LP panel, market info |
| `/admin` | Pick Clanker token → create market, view active/resolved markets |
| `/portfolio` | User positions, claimable winnings, LP positions |

### Data Flow
```
1. Admin picks $MEMECOIN from Clanker trending list in admin panel
2. Backend creates market on-chain (snapshots Uniswap tick)
3. Users see market: "Will $MEMECOIN be UP in 10 min?"
4. User clicks "Buy YES for 10 USDC"
5. Frontend calls TS API (POST /api/markets/:addr/buy) -> receives unsigned tx data
6. Frontend prompts wallet to sign + send tx via wagmi
7. 10 min later: auto-resolver calls resolve() on-chain
   → Contract reads current tick from Uniswap → compares → resolves
8. Users claim winnings
```

---

## USDC Notes
- Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Base Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 6 decimals -- all math must account for this
- Use `SafeERC20` for all transfers
- Frontend must handle USDC approval before first trade (or use `permit`)

---

## Implementation Order

### Phase 1: Smart Contracts -- MOSTLY DONE
1. [x] `forge init` + install OpenZeppelin
2. [x] Implement `OutcomeToken.sol`
3. [x] Implement `PredictionMarket.sol` (mint, redeem, CPMM, LP, resolve, claim)
4. [x] Implement `MarketFactory.sol`
5. [x] Foundry tests with mock USDC (6 decimals) -- 26/26 passing
6. [ ] **Add on-chain price oracle**: IUniswapV3Pool interface, pricePool/snapshotTick/token0IsQuote state, update resolve() to read slot0()
7. [ ] **Update MarketFactory**: pass pricePool + token0IsQuote to createMarket
8. [ ] **Update tests**: mock Uniswap pool, test resolve with tick comparison

### Phase 2: TS Backend
1. Scaffold Express + viem + SQLite + dotenv
2. Chain client (publicClient + walletClient)
3. Clanker API client (token discovery)
4. Market read endpoints (on-chain reads)
5. TX builder endpoints
6. Admin endpoints (create market with pool address, trigger resolve)
7. Auto-resolver (poll expired markets, call resolve() on-chain)

### Phase 3: Frontend
1. Scaffold Next.js + wagmi + RainbowKit + Tailwind
2. API client layer (calls TS backend)
3. Market list page (with countdown timers)
4. Market detail + trade page
5. Admin panel (Clanker token picker → create market)
6. Portfolio page

### Phase 4: Integration + Deploy
1. Deploy contracts to Base Sepolia
2. Point TS backend at Base Sepolia RPC
3. E2E test: pick token → create market → trade → auto-resolve → claim
4. Deploy frontend (Vercel) + backend (Railway/Fly.io)

---

## Verification
1. **Foundry tests:** mint/redeem invariant, buy/sell, LP math, on-chain resolution with mock Uni pool, claims, edge cases
2. **Backend tests:** API endpoint tests, resolver tests
3. **Integration:** full lifecycle on Base Sepolia
4. **Frontend E2E:** connect wallet → browse → trade → wait 10 min → claim
