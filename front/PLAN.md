# Horus Frontend — Agile Plan

> Next.js 14 (App Router) · wagmi v2 · viem · RainbowKit · Tailwind CSS
> Consumes Go backend REST API · Users sign txs via wallet (non-custodial)

---

## Story Point Scale

| Points | Meaning |
|--------|---------|
| 1 | Trivial — config, copy-paste, < 30 min |
| 2 | Small — straightforward component or util, ~1h |
| 3 | Medium — some logic or integration, ~2-3h |
| 5 | Large — significant feature, multiple components, ~half day |
| 8 | XL — complex feature with edge cases, ~full day |

---

## Epic 1: Project Scaffolding & Infra

> Bootstrap the Next.js app with all dependencies, wallet connection, and API client layer.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 1.1 | **Scaffold Next.js 14 App Router project** with TypeScript, Tailwind CSS, ESLint | 1 | `npm run dev` starts clean app |
| 1.2 | **Install & configure wagmi v2 + viem + RainbowKit** — providers, chains (Base, Base Sepolia), transports | 3 | Wallet connect button renders, can connect MetaMask/Rabby |
| 1.3 | **Create API client module** (`lib/api.ts`) — typed functions wrapping all Go backend endpoints (markets, trade, liquidity, user, admin) | 3 | All endpoints from Go API have corresponding typed async functions |
| 1.4 | **Set up shared types** (`types/market.ts`, `types/position.ts`) matching Go backend response shapes | 2 | Types cover Market, Price, Position, Claimable, TxData |
| 1.5 | **Global layout** — header with logo, nav links (Markets, Portfolio, Admin), wallet connect button, footer | 2 | Layout renders on all pages, responsive |
| 1.6 | **Environment config** — `.env.local` for `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CHAIN_ID`, contract addresses | 1 | Env vars consumed in API client and wagmi config |

**Epic total: 12 pts**

---

## Epic 2: Market List Page (`/`)

> Homepage showing all available prediction markets as cards.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 2.1 | **MarketCard component** — displays question, YES/NO prices as probability bars, volume, status badge (Open/Resolved) | 3 | Card renders with mock data, visually polished |
| 2.2 | **Market list page** — fetches `GET /api/markets`, renders grid of MarketCards, loading skeleton, empty state | 3 | Page loads markets from API, shows skeleton while loading |
| 2.3 | **Market filtering/sorting** — tabs or toggles for Active / Resolved / All, sort by volume or newest | 2 | User can filter and sort, URL params preserved |
| 2.4 | **Search bar** — client-side filter by market question text | 1 | Typing filters visible cards in real time |

**Epic total: 9 pts**

---

## Epic 3: Market Detail & Trading Page (`/market/[address]`)

> Core trading experience — view market info, buy/sell YES/NO tokens.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 3.1 | **Market header section** — question, resolution time countdown, current YES/NO prices, status | 3 | Displays all market metadata, countdown ticks |
| 3.2 | **Price chart / probability display** — visual representation of YES price over time (simple line or bar) | 5 | Chart renders price history or at minimum current probability as a visual gauge |
| 3.3 | **Trade panel — Buy flow** — toggle YES/NO, USDC input, estimated tokens out, submit | 5 | User enters amount, sees estimate, clicks Buy, wallet prompt fires, tx confirms, UI refreshes |
| 3.4 | **Trade panel — Sell flow** — toggle YES/NO, token input, estimated USDC out, submit | 5 | Same as buy but in reverse direction |
| 3.5 | **USDC approval handling** — detect allowance, prompt `approve` tx before first trade if needed | 3 | If allowance < trade amount, user is prompted to approve first |
| 3.6 | **Transaction status feedback** — pending spinner, success toast, error toast, etherscan link | 3 | User sees clear feedback for every tx state |
| 3.7 | **Mint & Redeem panel** — mint equal YES+NO from USDC, redeem pairs back to USDC | 3 | Mint/redeem works end-to-end with wallet signing |
| 3.8 | **Claim panel (post-resolution)** — if market resolved, show winning side, claim button, USDC payout | 3 | Resolved market shows outcome + claim CTA, claim tx works |
| 3.9 | **Market info sidebar** — total volume, liquidity depth, resolution source, contract address link | 2 | Info section displays all relevant metadata |

**Epic total: 32 pts**

---

## Epic 4: Liquidity Provider Panel

> Embedded in market detail page — add/remove liquidity.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 4.1 | **Add Liquidity form** — USDC input, estimated LP shares, submit | 3 | User adds liquidity, receives LP shares, UI updates |
| 4.2 | **Remove Liquidity form** — LP share input, estimated USDC + excess tokens out, submit | 3 | User removes liquidity, receives assets, UI updates |
| 4.3 | **LP position display** — show user's LP shares, share of pool %, earned fees estimate | 3 | Connected user sees their LP position on the market page |

**Epic total: 9 pts**

---

## Epic 5: Portfolio Page (`/portfolio`)

> User's positions, claimable winnings, LP positions across all markets.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 5.1 | **Positions table** — list of markets where user holds YES/NO tokens, with current value | 5 | Table fetches `GET /api/users/:address/positions`, renders balances + PnL |
| 5.2 | **Claimable winnings section** — resolved markets with unclaimed USDC, batch claim or per-market claim | 3 | Fetches `GET /api/users/:address/claimable`, claim buttons work |
| 5.3 | **LP positions section** — markets where user has LP shares, pool share %, value estimate | 3 | LP positions displayed with relevant stats |
| 5.4 | **Empty / not-connected state** — prompt wallet connection if not connected, empty state if no positions | 1 | Graceful UX for both states |

**Epic total: 12 pts**

---

## Epic 6: Admin Panel (`/admin`)

> Create markets, manually resolve, view auto-resolver status.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 6.1 | **Create Market form** — question, resolution time picker, initial liquidity amount, submit | 5 | Admin creates market via `POST /api/admin/markets`, new market appears in list |
| 6.2 | **Resolve Market panel** — list unresolved markets, YES/NO resolve buttons, confirmation modal | 3 | Admin resolves market, status updates to Resolved |
| 6.3 | **Admin auth gate** — check connected wallet against admin address, hide/disable if not admin | 2 | Non-admin sees "Not authorized" message |
| 6.4 | **Auto-resolver status view** — display which markets have auto-resolution configured, next check time | 2 | Status info renders from API data |

**Epic total: 12 pts**

---

## Epic 7: Polish & UX

> Cross-cutting UX improvements, responsiveness, error handling.

| ID | Story | Points | Acceptance Criteria |
|----|-------|--------|---------------------|
| 7.1 | **Responsive design pass** — mobile-first layout for all pages, collapsible nav | 3 | All pages usable on 375px+ screens |
| 7.2 | **Loading states & skeletons** — consistent skeleton components for all data-fetching views | 2 | No layout shift, smooth loading experience |
| 7.3 | **Error boundary & fallback UI** — global error boundary, per-component error states | 2 | Errors caught gracefully, user sees retry option |
| 7.4 | **Toast / notification system** — unified toast for tx success, tx error, API errors | 2 | All user-facing events produce appropriate toasts |
| 7.5 | **Dark mode** — Tailwind dark mode with system preference detection + toggle | 2 | Toggle works, all components styled for both themes |
| 7.6 | **SEO & metadata** — page titles, OG tags, favicon | 1 | Each page has unique title and meta description |

**Epic total: 12 pts**

---

## Sprint Plan (Hackathon — ~2 days)

### Sprint 1 — Foundation (Day 1 Morning)
- Epic 1 (all stories): Scaffolding, wallet, API client, layout
- **Target: 12 pts**

### Sprint 2 — Core Pages (Day 1 Afternoon → Evening)
- Epic 2 (all): Market list
- Epic 3 (3.1–3.6): Market detail + buy/sell trading
- **Target: 22 pts**

### Sprint 3 — Complete Features (Day 2 Morning)
- Epic 3 (3.7–3.9): Mint/redeem, claim, market info
- Epic 4 (all): LP panel
- Epic 5 (all): Portfolio
- **Target: 21 pts**

### Sprint 4 — Admin & Polish (Day 2 Afternoon)
- Epic 6 (all): Admin panel
- Epic 7 (7.1–7.4): Responsive, loading, errors, toasts
- **Target: 21 pts**

### Stretch (if time permits)
- Epic 7 (7.5–7.6): Dark mode, SEO

---

## Summary

| Epic | Name | Points |
|------|------|--------|
| 1 | Project Scaffolding & Infra | 12 |
| 2 | Market List Page | 9 |
| 3 | Market Detail & Trading | 32 |
| 4 | Liquidity Provider Panel | 9 |
| 5 | Portfolio Page | 12 |
| 6 | Admin Panel | 12 |
| 7 | Polish & UX | 12 |
| | **Total** | **98** |

---

## Dependencies

- **Go backend must be running** with at least market list + price endpoints for Epic 2+
- **Contracts deployed to Base Sepolia** for end-to-end tx testing (Epic 3+)
- **USDC faucet / test USDC** needed for trading flows
- Epic 3 depends on Epic 1 (wallet + API client)
- Epic 5 depends on Epic 3 (need trades to have positions)
- Epic 6 depends on Epic 1 (wallet + API client)
