# Horus

Fully onchain prediction market - ETHDenver Buidlathon 2026

## Architecture

```
Frontend (Next.js) <-> Go Backend (REST API) <-> Base Chain (Solidity)
```

- **Contracts**: Custom ERC-20 YES/NO tokens with CPMM (constant product market maker)
- **Backend**: Go middleware - event indexer, tx builder, auto-resolver
- **Frontend**: Next.js + wagmi + RainbowKit

## How It Works

1. Markets are binary (YES/NO) with USDC collateral on Base
2. `1 YES + 1 NO = 1 USDC` (always fully collateralized)
3. CPMM pool provides price discovery (prices = probabilities)
4. Anyone can provide liquidity, earning 2% trading fees
5. Admin or auto-resolver resolves markets, winners claim USDC 1:1

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `OutcomeToken.sol` | ERC-20 with restricted mint/burn (onlyMarket) |
| `PredictionMarket.sol` | Core: mint/redeem, CPMM buy/sell, LP, resolution, claims |
| `MarketFactory.sol` | Deploys markets, seeds liquidity, admin management |

## Development

### Contracts (Foundry)

```bash
cd contracts
forge build
forge test -v
```

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Go 1.22+
- Node.js 18+

## USDC

- Base mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 6 decimals
