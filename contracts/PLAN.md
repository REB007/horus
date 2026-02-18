# Horus Contracts — Upgrade Plan

## Current State

All three contracts are **deployed and tested** (26/26 tests passing):

- **OutcomeToken.sol** (26 lines) — Minimal ERC-20 with `onlyMarket` mint/burn. **No changes needed.**
- **PredictionMarket.sol** (309 lines) — CPMM market with mint/redeem/buy/sell/LP/resolve/claim. **Needs oracle upgrade.**
- **MarketFactory.sol** (72 lines) — Deploys markets, seeds liquidity, admin management. **Needs new params.**
- **PredictionMarket.t.sol** (448 lines) — Full test suite. **Needs oracle test coverage.**

---

## What Needs to Change

### Goal
Replace `resolve(bool _yesWins)` (admin picks outcome) with `resolve()` (admin triggers, contract reads Uniswap V3 price).

### Summary of Changes

| File | Change | Lines affected |
|------|--------|---------------|
| `interfaces/IUniswapV3Pool.sol` | **NEW** — minimal interface for `slot0()` | ~10 lines |
| `PredictionMarket.sol` | Add oracle state, update constructor, rewrite `resolve()` | ~30 lines changed |
| `MarketFactory.sol` | Add `_pricePool` + `_token0IsQuote` to `createMarket()` | ~10 lines changed |
| `test/PredictionMarket.t.sol` | Add `MockUniswapV3Pool`, update all resolve tests | ~80 lines changed |

---

## Detailed Changes

### 1. NEW: `interfaces/IUniswapV3Pool.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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

    function token0() external view returns (address);
    function token1() external view returns (address);
}
```

Why `token0()` and `token1()`? The backend needs to call `pool.token0()` on-chain to determine `token0IsQuote` before creating a market. Including them in the interface costs nothing.

---

### 2. UPDATE: `PredictionMarket.sol`

#### New imports
```solidity
import "./interfaces/IUniswapV3Pool.sol";
```

#### New state variables (add after existing state)
```solidity
// --- Price Oracle ---
IUniswapV3Pool public pricePool;     // Uniswap V3 pool for the memecoin
int24 public snapshotTick;           // tick at market creation
bool public token0IsQuote;           // true if token0 is the quote asset (WETH)
```

#### Updated constructor
```solidity
constructor(
    address _usdc,
    address _admin,
    string memory _question,
    uint256 _resolutionTime,
    address _pricePool,          // NEW
    bool _token0IsQuote          // NEW
) {
    usdc = IERC20(_usdc);
    admin = _admin;
    question = _question;
    resolutionTime = _resolutionTime;

    yesToken = new OutcomeToken("YES Token", "YES", address(this));
    noToken = new OutcomeToken("NO Token", "NO", address(this));

    // Snapshot price at creation
    pricePool = IUniswapV3Pool(_pricePool);
    token0IsQuote = _token0IsQuote;
    (, snapshotTick,,,,,) = pricePool.slot0();
}
```

#### Rewritten `resolve()`
```solidity
function resolve() external onlyAdmin notResolved {
    require(block.timestamp >= resolutionTime, "PredictionMarket: too early");

    (, int24 currentTick,,,,,) = pricePool.slot0();

    // If token0 is quote (WETH), tick DOWN = memecoin price UP
    // If token0 is memecoin, tick UP = memecoin price UP
    bool priceUp = token0IsQuote
        ? currentTick < snapshotTick
        : currentTick > snapshotTick;

    resolved = true;
    yesWins = priceUp;
    emit MarketResolved(priceUp);
}
```

**Breaking change:** `resolve(bool _yesWins)` → `resolve()`. No parameter needed — the contract reads the price itself.

#### New view function (optional, useful for frontend)
```solidity
function getSnapshotTick() external view returns (int24) {
    return snapshotTick;
}

function getCurrentTick() external view returns (int24) {
    (, int24 tick,,,,,) = pricePool.slot0();
    return tick;
}
```

---

### 3. UPDATE: `MarketFactory.sol`

#### New import
```solidity
import "./interfaces/IUniswapV3Pool.sol";
```

#### Updated `createMarket()`
```solidity
function createMarket(
    string calldata _question,
    uint256 _resolutionTime,
    uint256 _initialLiquidity,
    address _pricePool,          // NEW
    bool _token0IsQuote          // NEW
) external onlyAdmin returns (address) {
    require(_initialLiquidity > 0, "need initial liquidity");
    require(_pricePool != address(0), "need price pool");

    PredictionMarket market = new PredictionMarket(
        address(usdc),
        admin,
        _question,
        _resolutionTime,
        _pricePool,              // NEW
        _token0IsQuote           // NEW
    );

    usdc.safeTransferFrom(msg.sender, address(this), _initialLiquidity);
    usdc.approve(address(market), _initialLiquidity);
    market.addLiquidity(_initialLiquidity);

    markets.push(address(market));

    emit MarketCreated(address(market), _question, _resolutionTime, _initialLiquidity);
    return address(market);
}
```

---

### 4. UPDATE: `test/PredictionMarket.t.sol`

#### New mock contract
```solidity
contract MockUniswapV3Pool {
    int24 public currentTick;
    address public token0Addr;
    address public token1Addr;

    constructor(int24 _tick, address _token0, address _token1) {
        currentTick = _tick;
        token0Addr = _token0;
        token1Addr = _token1;
    }

    function setTick(int24 _tick) external {
        currentTick = _tick;
    }

    function slot0() external view returns (
        uint160, int24, uint16, uint16, uint16, uint8, bool
    ) {
        return (0, currentTick, 0, 0, 0, 0, true);
    }

    function token0() external view returns (address) {
        return token0Addr;
    }

    function token1() external view returns (address) {
        return token1Addr;
    }
}
```

#### Updated `setUp()`
```solidity
MockUniswapV3Pool mockPool;

function setUp() public {
    usdc = new MockUSDC();

    // Mock Uniswap pool: tick = -230400 (some arbitrary starting tick)
    // token0 = WETH (quote), token1 = MEMECOIN
    mockPool = new MockUniswapV3Pool(-230400, address(0xWETH), address(0xMEME));

    vm.prank(admin);
    factory = new MarketFactory(address(usdc));

    // ... mint USDC ...

    vm.startPrank(admin);
    usdc.approve(address(factory), 1000 * USDC_UNIT);
    address marketAddr = factory.createMarket(
        "Will $MEME be UP in 10 min?",
        block.timestamp + 600,       // 10 minutes
        1000 * USDC_UNIT,
        address(mockPool),           // NEW
        true                         // NEW: token0 is quote (WETH)
    );
    market = PredictionMarket(marketAddr);
    vm.stopPrank();
}
```

#### New/updated resolution tests

| Test | Description |
|------|-------------|
| `test_resolveYes_priceUp` | Set mock tick lower (token0IsQuote=true → lower tick = price up) → resolve → assert yesWins |
| `test_resolveNo_priceDown` | Set mock tick higher → resolve → assert !yesWins |
| `test_resolveNo_priceEqual` | Keep same tick → resolve → assert !yesWins (not strictly "up") |
| `test_resolveTooEarly` | Call resolve before resolutionTime → expect revert "too early" |
| `test_resolveOnlyAdmin` | Non-admin calls resolve → expect revert |
| `test_resolveOnce` | Call resolve twice → expect revert "already resolved" |
| `test_snapshotTickStoredAtCreation` | Assert `market.snapshotTick() == -230400` |
| `test_token0IsQuoteFalse` | Create market with token0IsQuote=false, verify opposite tick logic |

#### Tests that need updating (signature change)

All existing tests that call `market.resolve(true)` or `market.resolve(false)` must be updated:
- `test_resolveYes` → set mock tick to simulate price up, then call `resolve()` (no args)
- `test_resolveNo` → set mock tick to simulate price down, then call `resolve()`
- `test_resolveOnlyAdmin` → call `resolve()` (no args)
- `test_resolveOnce` → call `resolve()` twice
- `test_claimWinnerYes` → set tick for price up, call `resolve()`
- `test_claimLoserGetsNothing` → set tick for price up, call `resolve()`
- `test_cannotBuyAfterResolution` → set tick, call `resolve()`
- `test_fullLifecycle` → set tick, call `resolve()`

---

## Tick Direction Cheat Sheet

Uniswap V3 tick represents `log1.0001(token0/token1)`.

| Pool layout | token0IsQuote | Memecoin price UP means | tick moves |
|---|---|---|---|
| token0=WETH, token1=MEME | `true` | MEME/WETH ratio up → WETH/MEME down | tick **decreases** |
| token0=MEME, token1=WETH | `false` | MEME/WETH ratio up | tick **increases** |

Resolution logic:
```
priceUp = token0IsQuote ? (currentTick < snapshotTick) : (currentTick > snapshotTick)
```

Equal tick → `priceUp = false` → NO wins (not strictly "up").

---

## Epics & Story Points

**1 SP ≈ 30 min.**

### Epic C1: IUniswapV3Pool Interface (0.5 SP)
| ID | Task | SP |
|----|------|----|
| C1.1 | Create `src/interfaces/IUniswapV3Pool.sol` with `slot0()`, `token0()`, `token1()` | 0.5 |

### Epic C2: PredictionMarket Oracle Upgrade (2 SP)
| ID | Task | SP |
|----|------|----|
| C2.1 | Add `pricePool`, `snapshotTick`, `token0IsQuote` state variables | 0.5 |
| C2.2 | Update constructor: accept `_pricePool` + `_token0IsQuote`, snapshot tick | 0.5 |
| C2.3 | Rewrite `resolve()`: remove `bool` param, read `slot0()`, compare ticks | 0.5 |
| C2.4 | Add `getCurrentTick()` view function | 0.5 |

### Epic C3: MarketFactory Update (0.5 SP)
| ID | Task | SP |
|----|------|----|
| C3.1 | Add `_pricePool` + `_token0IsQuote` params to `createMarket()`, pass to constructor | 0.5 |

### Epic C4: Test Suite Update (3 SP)
| ID | Task | SP |
|----|------|----|
| C4.1 | Create `MockUniswapV3Pool` contract with settable tick | 0.5 |
| C4.2 | Update `setUp()` to use mock pool + new `createMarket()` signature | 0.5 |
| C4.3 | Update all existing resolve/claim/lifecycle tests for new `resolve()` signature | 1 |
| C4.4 | Add new oracle-specific tests (tick direction, too early, snapshot, token0IsQuote=false) | 1 |

### Epic C5: Compile & Verify (0.5 SP)
| ID | Task | SP |
|----|------|----|
| C5.1 | `forge build` — fix any compilation errors | 0.25 |
| C5.2 | `forge test` — all tests green | 0.25 |

---

## Implementation Order

```
C1 (interface) → C2 (PredictionMarket) → C3 (Factory) → C4 (tests) → C5 (verify)
```

**Total: ~6.5 SP ≈ 3.5 hours**

---

## Files Touched

```
contracts/
  src/
    interfaces/
      IUniswapV3Pool.sol       -- NEW
    PredictionMarket.sol       -- MODIFIED (oracle state, constructor, resolve)
    MarketFactory.sol          -- MODIFIED (createMarket params)
    OutcomeToken.sol           -- UNCHANGED
  test/
    PredictionMarket.t.sol     -- MODIFIED (mock pool, updated tests, new tests)
```

---

## Risk & Notes

- **No changes to CPMM logic** — mint, redeem, buy, sell, LP, claim are all untouched
- **Breaking change**: `resolve(bool)` → `resolve()`. ABI changes. Backend must use new ABI.
- **Mock pool in tests**: `setTick()` lets us simulate any price movement without a real Uniswap deployment
- **Clanker pools on mainnet**: all Clanker tokens have Uniswap V3 pools by default (Clanker deploys them). `pool_address` comes from the Clanker API.
- **Base Sepolia testing**: may need to find/deploy a real Uniswap V3 pool for integration tests, or use a mock contract deployed on Sepolia
- **Gas**: reading `slot0()` is a single SLOAD (~2100 gas). Negligible cost.
