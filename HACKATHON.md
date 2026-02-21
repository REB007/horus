# The problem it solves

Prediction markets today are either centralized (the operator picks the outcome) or limited to assets on a single chain. Horus solves both problems:

**Multi-chain price markets for any token.** Users can bet on whether *any* token with Uniswap liquidity — on Ethereum, Base, or any supported chain — will go up in 10 minutes. The market contract lives on Ethereum Sepolia, but the price oracle reads from tokens on other chains via the Uniswap API. This means you can create a prediction market for a Base memecoin while settling in USDC on Sepolia.

**Auditable oracle with a path to trustlessness.** The admin submits the price, but *cannot fabricate it*. Every market stores its oracle metadata on-chain — the API endpoint, source chain, pool address, and token address. Anyone can independently query the same Uniswap API endpoint and verify the submitted price matches. This metadata is also the exact input specification for a future zkTLS verifier, which would make resolution fully permissionless and provably correct without any admin involvement.

**What users can do:**
- **Create markets** — anyone with ≥10 USDC can create a 10-minute prediction market for any token (permissionless on the contract level)
- **Trade** — buy YES/NO tokens with USDC. Prices reflect crowd probability via a constant-product AMM (CPMM)
- **Provide liquidity** — earn 2% swap fees by adding USDC to the pool
- **Claim winnings** — after resolution, winning token holders redeem 1:1 for USDC
- **Mint/Redeem** — always mint 1 YES + 1 NO for 1 USDC, or redeem the pair back. Fully collateralized at all times.

**Why it matters:** Short-duration prediction markets on memecoins are a natural fit — high volatility, high engagement, fast feedback loops. Horus makes this possible across chains with an auditable oracle, moving the trust model from "trust the operator" to "verify the data source yourself."

# Challenges I ran into

**Decoupling the oracle from the market chain.** V1 and V2 of the contract read the price directly from a Uniswap V3 pool on the same chain (`slot0().tick`). This meant markets could only exist for tokens with pools on the deployment chain. Moving to a submitted-price model (V3) required rethinking the entire resolution flow — the contract no longer reads the price itself, so we needed to store oracle metadata on-chain to keep the system auditable. Getting the right balance between "fast to build" and "architecturally sound for future zkTLS" took several iterations.

**Uniswap API response format inconsistencies.** The Uniswap Trade API returns price data in different formats depending on the routing path — sometimes `quote.output.amount` (raw bigint), sometimes `quote.outputAmount`, sometimes `quote.quoteDecimals` (human-readable float). We had to handle all three variants and normalize to a consistent 18-decimal int256 format for the contract. The API also returns 504 gateway timeouts under load, so we added retry logic with exponential backoff.

**Multi-hop price routing.** Many tokens (especially memecoins) don't have a direct USDC pool. The initial implementation failed silently for these tokens. We had to build a two-hop fallback (token → WETH → USDC) using two sequential quote calls, which introduced complexity around decimal handling — WETH uses 18 decimals while USDC uses 6.

**USDC approval flow for permissionless creation.** V2's factory pulled USDC from the admin wallet. V3 allows anyone to create a market, so the factory now pulls USDC from `msg.sender`. This required adding an explicit `approve` transaction before `createMarket` — a two-step flow that needed careful handling in both the API (for admin-created markets) and the frontend (for user-created markets).

**Frontend crashes from undefined on-chain data.** When the API failed to read on-chain data (e.g. during RPC timeouts), it returned market objects without `yesReserve`, `noReserve`, or price fields. The frontend called `BigInt(undefined)` and crashed. We had to add defensive fallbacks at both the API layer (return zero defaults on failure) and the frontend (guard every BigInt conversion).

**Contract version migration.** Upgrading from V2 to V3 ABIs across the entire stack (API routes, chain service, test scripts, frontend config) was error-prone. A single missed ABI reference would cause silent failures where the contract call returned unexpected data. We caught several of these only through the integration test suite.



# Use of AI tools and agents

**Windsurf Cascade** was used extensively as a pair-programming agent throughout the entire development lifecycle:

- **Architecture & Planning** — Cascade helped design the V1 → V2 → V3 contract evolution, wrote detailed sprint plans (`PLAN_V3.md`, `planv3.yaml`) with story points and implementation order, and helped scope the hackathon-focused feature set
- **Smart Contract Development** — Wrote and iterated on `PredictionMarket_v3.sol`, `MarketFactory_v3.sol`, and the full Foundry test suite (12 tests covering resolution, permissionless creation, lifecycle, and edge cases)
- **Backend Integration** — Built the Uniswap API price service (`uniswap.ts`) with multi-hop routing and retry logic, updated all API routes from V2 to V3 ABIs, and wired the auto-resolver to fetch prices from Uniswap before calling `resolve(price)` on-chain
- **Frontend** — Updated the market detail page to display oracle metadata (snapshot price, resolution price, source chain, source token), refactored the admin page, and added the Farcaster share button
- **Debugging & Iteration** — Fixed frontend crashes from undefined on-chain data, optimized loading states, and resolved ABI mismatches during the V2→V3 migration
- **Documentation** — Wrote the README, TODO, and this submission document

The AI agent operated as a persistent coding partner across multiple sessions, maintaining context about the project's architecture, trust model, and hackathon constraints.

# Tracks applied

## New France Village — The Future of Finance

Horus is a **fully on-chain DeFi primitive**: binary prediction markets with USDC collateral, a constant-product AMM, and permissionless market creation. It sits at the intersection of several Future of Finance themes:

**DeFi infrastructure.** Every component is on-chain and composable — ERC-20 outcome tokens, a CPMM pool, fully collateralized minting (`1 YES + 1 NO = 1 USDC`), and permissionless liquidity provision with fee accrual. The contracts are standard Solidity with OpenZeppelin, deployable on any EVM chain.

**Main Street adoption.** Prediction markets are one of the most intuitive DeFi products — "Will this token go up?" is a question anyone understands. Horus reduces the barrier further: 10-minute markets, USDC-denominated, one-click trading via RainbowKit, and a clean UI that abstracts away the on-chain complexity. Users don't need to understand AMM math or oracle mechanics to participate.

**Cross-chain price discovery.** Markets settle on Ethereum Sepolia but price tokens on *any* Uniswap-supported chain (Ethereum mainnet, Base, etc.) via the Uniswap Developer API. This is a practical demonstration of cross-chain DeFi — using off-chain price feeds with on-chain auditability, bridging liquidity information across chains without bridges.

**Path to trustlessness.** The architecture is designed for progressive decentralization. Today: admin submits prices, but oracle metadata on-chain makes every submission auditable. Tomorrow: zkTLS proofs verify the Uniswap API response cryptographically, removing the admin entirely. The contract already stores everything a verifier needs — no migration required, just add a `resolveWithProof()` function.

**Stablecoins as settlement.** All collateral is USDC — prediction markets become a stablecoin-native financial product where users speculate on volatile assets while their principal and winnings are always denominated in dollars.

---

## Uniswap Foundation: Integrate the Uniswap API in your platform

Horus uses the **Uniswap Developer API** as its **sole price oracle** for prediction market creation and resolution. This is not a peripheral integration — the Uniswap API is the core infrastructure that makes the entire protocol work.

### How it's integrated

The backend service (`api/src/services/uniswap.ts`) calls the Uniswap Trade API at `https://trade-api.gateway.uniswap.org/v1/quote` with an API key generated from the [Uniswap Developer Platform](https://developers.uniswap.org/dashboard).

**Two critical price fetches per market:**

1. **At market creation** — fetches the current USD price of the token via `POST /v1/quote` (EXACT_INPUT, 1e18 token → USDC). This becomes the `snapshotPrice` stored on-chain.
2. **At resolution (10 min later)** — fetches the price again via the same endpoint. This `resolutionPrice` is submitted to the contract, which compares: `resolutionPrice > snapshotPrice` → YES wins.

**Multi-chain support:** The API is called with the token's native `chainId` (e.g. 8453 for Base), so Horus can create prediction markets for tokens on *any* Uniswap-supported chain while the market contract itself lives on Sepolia.

**Multi-hop routing:** If no direct token/USDC pool exists, the service automatically routes through WETH (token → WETH → USDC) using two sequential quote calls.

**Reliability:** Built-in retry logic with exponential backoff for 504 gateway timeouts and AbortController-based request timeouts (15s).

**Price check endpoint:** `GET /api/admin/price-check/:chainId/:tokenAddress` lets the frontend verify a token is priceable on Uniswap *before* creating a market, preventing failed transactions.

### Why this is a creative use of the API

Most Uniswap API integrations use it for swap execution. Horus uses it as a **cross-chain price oracle for a prediction market protocol** — a novel use case where the quote endpoint provides the price data that determines binary market outcomes. The oracle metadata (including the API endpoint URL) is stored on-chain per market, making every price submission auditable and laying the groundwork for zkTLS-verified trustless resolution.
