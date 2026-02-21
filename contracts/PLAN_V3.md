# Horus Contracts V3 — Hackathon Upgrade Plan

> **Scope: build fast, ship today.** Admin resolves. Oracle metadata stored for future zkTLS. No dead code.

---

## TL;DR — What V3 Changes

| What | V2 | V3 |
|------|----|----|
| **Oracle** | `slot0().tick` from same-chain Uniswap pool | Submitted `int256` price — token can be on **any chain** |
| **Resolution** | `resolve()` — admin triggers, contract reads price | `resolve(int256 price)` — admin submits price from Uniswap API |
| **Market creation** | `onlyAdmin` | **Permissionless** — anyone with ≥10 USDC |
| **Oracle metadata** | `pricePool` address only | `oracleEndpoint` + `sourceChainId` + `sourcePool` + `sourceToken` stored on-chain |
| **CPMM** | unchanged | unchanged |
| **zkTLS** | N/A | **Not in contract** — metadata enables it later (see Future Work) |

---

## Detailed Changes

### 1. `PredictionMarket_v3.sol` (copy V2, apply diffs)

**Remove:**
```solidity
import "./interfaces/IUniswapV3Pool.sol";
IUniswapV3Pool public pricePool;
int24 public snapshotTick;
bool public token0IsQuote;
function getCurrentTick() ...
```

**Add state:**
```solidity
// --- Oracle Metadata (stored for future zkTLS verification) ---
string public oracleEndpoint;       // "https://api.uniswap.org/v2/quote"
uint256 public sourceChainId;       // 1 = Ethereum, 8453 = Base, etc.
address public sourcePool;          // Uniswap V3 pool on source chain
address public sourceToken;         // memecoin on source chain

// --- Price (int256, 18 decimals) ---
int256 public snapshotPrice;        // set at creation
int256 public resolutionPrice;      // set at resolution
```

**Why store metadata?** So anyone can audit what data source the market used. When a zkTLS verifier exists, it can verify proofs against this exact endpoint + params.

**New constructor:**
```solidity
constructor(
    address _usdc, address _admin, string memory _question, uint256 _resolutionTime,
    string memory _oracleEndpoint, uint256 _sourceChainId,
    address _sourcePool, address _sourceToken,
    int256 _snapshotPrice
) {
    // ... store everything, no slot0() call
}
```

**Replace `resolve()` → `resolve(int256)`:**
```solidity
function resolve(int256 _resolutionPrice) external onlyAdmin notResolved {
    require(block.timestamp >= resolutionTime, "too early");
    resolutionPrice = _resolutionPrice;
    resolved = true;
    yesWins = _resolutionPrice > snapshotPrice;
    emit MarketResolved(yesWins);
}
```

That's it. One function. Admin submits price, contract compares. Same trust as V2 but now the price source is auditable and the token can be on any chain.

**Everything else UNCHANGED:** `mint`, `redeem`, `buy`, `sell`, `addLiquidity`, `removeLiquidity`, `claim`, `getYesPrice`, `getNoPrice`, `getReserves`.

---

### 2. `MarketFactory_v3.sol` (copy V2, apply diffs)

**Remove:** `onlyAdmin` from `createMarket`

**Add:**
```solidity
uint256 public constant MIN_LIQUIDITY = 10 * 1e6; // 10 USDC
```

**New `createMarket` signature:**
```solidity
function createMarket(
    string calldata _question,
    uint256 _resolutionTime,
    uint256 _initialLiquidity,
    string calldata _oracleEndpoint,
    uint256 _sourceChainId,
    address _sourcePool,
    address _sourceToken,
    int256 _snapshotPrice
) external returns (address) {
    require(_initialLiquidity >= MIN_LIQUIDITY, "below min liquidity");
    // deploy market, seed liquidity from msg.sender
}
```

USDC comes from `msg.sender` (the creator), not admin.

---

### 3. Tests — `test/v3/PredictionMarketV3.t.sol`

| Test | What |
|------|------|
| `test_permissionlessCreation` | Non-admin creates market |
| `test_minLiquidityReverts` | Below 10 USDC → revert |
| `test_oracleMetadataStored` | All fields stored correctly |
| `test_resolve_priceUp` | `resolutionPrice > snapshotPrice` → yesWins |
| `test_resolve_priceDown` | `resolutionPrice < snapshotPrice` → !yesWins |
| `test_resolve_priceEqual` | Equal → !yesWins |
| `test_resolve_tooEarly` | Before resolutionTime → revert |
| `test_resolve_onlyAdmin` | Non-admin → revert |
| `test_resolve_twice` | Double resolve → revert |
| `test_fullLifecycle` | Create → buy YES → resolve (up) → claim USDC |

CPMM tests: copy from V2, update constructor call only.

---

### 4. `script/DeployV3.s.sol`

```solidity
contract DeployV3 is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        vm.startBroadcast(pk);
        MarketFactoryV3 factory = new MarketFactoryV3(usdc);
        vm.stopBroadcast();
        console.log("MarketFactoryV3:", address(factory));
    }
}
```

---

## Epics & Story Points

**1 SP ≈ 30 min.**

### Epic C1: PredictionMarketV3 (2 SP)
| ID | Task | SP |
|----|------|----|
| C1.1 | Copy V2, remove `pricePool`/`snapshotTick`/`IUniswapV3Pool`/`getCurrentTick` | 0.5 |
| C1.2 | Add oracle metadata state + `snapshotPrice`/`resolutionPrice` | 0.25 |
| C1.3 | Update constructor: accept oracle params, store them, no `slot0()` | 0.5 |
| C1.4 | Rewrite `resolve(int256)`: admin submits price, compare to snapshot | 0.25 |
| C1.5 | Remove `token0IsQuote` logic from resolution (price comparison is now trivial) | 0.25 |
| C1.6 | Verify all other functions compile unchanged | 0.25 |

### Epic C2: MarketFactoryV3 (1 SP)
| ID | Task | SP |
|----|------|----|
| C2.1 | Copy V2, remove `onlyAdmin` from `createMarket`, add `MIN_LIQUIDITY` | 0.25 |
| C2.2 | Add oracle params to `createMarket()`, pass to market constructor | 0.5 |
| C2.3 | USDC from `msg.sender`, not admin | 0.25 |

### Epic C3: Tests (1.5 SP)
| ID | Task | SP |
|----|------|----|
| C3.1 | Setup: MockUSDC, factory, permissionless market creation | 0.25 |
| C3.2 | Resolution tests (up, down, equal, too early, only admin, double resolve) | 0.5 |
| C3.3 | Creation tests (permissionless, min liquidity, metadata stored) | 0.25 |
| C3.4 | Full lifecycle: create → buy → resolve → claim | 0.5 |

### Epic C4: Build & Deploy (0.5 SP)
| ID | Task | SP |
|----|------|----|
| C4.1 | `DeployV3.s.sol` | 0.1 |
| C4.2 | `forge build` + `forge test` — all green | 0.2 |
| C4.3 | Deploy to Sepolia, record address | 0.2 |

---

## Implementation Order

```
C1 (Market) → C2 (Factory) → C3 (Tests) → C4 (Deploy)
```

**Total: 5 SP ≈ 2.5 hours**

---

## Files

```
contracts/
  src/v3/
    PredictionMarket_v3.sol          -- NEW, based on V2 (~300 lines)
    MarketFactory_v3.sol             -- NEW, based on V2 (~90 lines)
  test/v3/
    PredictionMarketV3.t.sol         -- NEW (~150 lines)
  script/
    DeployV3.s.sol                   -- NEW (~15 lines)
  src/OutcomeToken.sol               -- UNCHANGED
```

No new interfaces needed. No IZkTlsVerifier.sol — that's future work.

---

## Price Format

**V2:** `int24` tick — Uniswap-specific, same-chain only.
**V3:** `int256` (18 decimals, USD). `1.0 = 1e18`. Simple: `resolutionPrice > snapshotPrice` → YES wins.

API fetches price from Uniswap API → converts float to `int256(price * 1e18)` → submits to contract.

---

## API Changes Required (separate plan)

| What | Change |
|------|--------|
| ABIs | Copy V3 ABIs from `contracts/out/` |
| `createMarket` | Pass oracle metadata + `snapshotPrice` from Uniswap API |
| `resolve` | Fetch price from Uniswap API → call `resolve(price)` |
| Auto-resolver | Same but calls `resolve(price)` instead of `resolve()` |
| Config | New `FACTORY_ADDRESS`, add `UNISWAP_API_KEY` |

---

## Future Work (NOT in this build)

These are **not implemented** but the architecture supports them:

1. **zkTLS trustless resolution** — Oracle metadata on-chain means a future `resolveWithProof(price, proof)` function can verify that the Uniswap API actually returned that price at resolution time. Needs TLSNotary or Reclaim Protocol adapter.
2. **Emergency fallback** — A `resolveEmergency()` that anyone can call after 24h if admin disappears. Defaults to NO wins.
3. **Dispute mechanism** — Challenge window after admin resolution where anyone can override with a zkTLS proof.
4. **TWAP oracle** — Use time-weighted average price instead of spot to prevent flash-loan manipulation.
5. **Creator fees** — Small % of trading volume goes to market creator as incentive.

The oracle metadata stored on-chain (`oracleEndpoint`, `sourceChainId`, `sourcePool`, `sourceToken`) is the foundation for all of these.

---

## Risk & Notes

- **CPMM untouched** — zero risk to trading logic
- **Breaking ABI**: `resolve()` → `resolve(int256)`. Backend must update.
- **Trust model**: Same as V2 — admin submits price. But now prices are **auditable** (metadata on-chain proves the source).
- **Gas**: ~100k extra at creation for storing metadata. Negligible.
- **V2 coexistence**: V3 is in `src/v3/`. V2 markets keep working.
