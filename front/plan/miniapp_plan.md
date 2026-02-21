# Horus — Farcaster Mini App Integration Plan

## Overview

Turn the existing Horus Next.js frontend into a **dual-mode** app:
- **Web mode** — works as a normal website with RainbowKit wallet connect (current behavior)
- **Mini App mode** — runs inside Warpcast with native Farcaster wallet, auth, and social features

The app is deployed on **Vercel** and uses **Sepolia** testnet. Farcaster Mini Apps support any EVM chain including Sepolia.

## Architecture

```
Warpcast (or web browser)
  └── Horus Next.js app (Vercel)
        ├── Detects environment (Farcaster SDK vs browser)
        ├── Uses Farcaster wallet provider OR RainbowKit
        ├── Serves /.well-known/farcaster.json manifest
        ├── Renders fc:miniapp meta tags for cast embeds
        └── Calls existing Horus API (unchanged)
```

## What changes

### New files
| File | Purpose |
|------|---------|
| `public/.well-known/farcaster.json` | Mini App manifest (account association + app metadata) |
| `lib/farcaster.ts` | SDK wrapper: env detection, init, context |
| `components/share-cast-button.tsx` | "Share on Farcaster" button for market pages |
| `app/api/og/[address]/route.tsx` | Dynamic OG image generation for market embed cards |
| `public/icon.png` | 200x200 app icon for Mini App store |
| `public/splash.png` | Splash screen image |

### Modified files
| File | Change |
|------|--------|
| `app/layout.tsx` | Add `fc:miniapp` meta tag in `<head>` |
| `app/providers.tsx` | Add Farcaster SDK init, dual wallet provider |
| `lib/wagmi.ts` | Support Farcaster EIP-1193 provider as a connector |
| `components/header.tsx` | Hide RainbowKit connect button when inside Warpcast |
| `app/market/[address]/page.tsx` | Add ShareCastButton |

### Unchanged
- API backend — no changes needed
- Smart contracts — no changes needed
- All existing pages — work as-is in WebView

## Implementation order

### Phase 1: Foundation (30 min)
1. Install `@farcaster/miniapp-sdk`
2. Create `lib/farcaster.ts` — SDK init + `isInMiniApp()` detection
3. Update `providers.tsx` — call `sdk.actions.ready()` when in Mini App
4. Update `layout.tsx` — add `fc:miniapp` meta tag

### Phase 2: Wallet bridge (30 min)
5. Update `lib/wagmi.ts` — add Farcaster provider as custom connector
6. Update `providers.tsx` — conditionally use Farcaster wallet vs RainbowKit
7. Update `header.tsx` — show Farcaster user info when in Mini App

### Phase 3: Social features (30 min)
8. Create `components/share-cast-button.tsx`
9. Add share button to market detail page
10. Create `/api/og/[address]/route.tsx` for dynamic OG images

### Phase 4: Manifest & deploy (20 min)
11. Create app icon + splash assets
12. Create `public/.well-known/farcaster.json` (placeholder — needs account association)
13. Deploy to Vercel
14. Generate account association using Farcaster developer tools
15. Update manifest with real signature
16. Test in Warpcast developer tools

## Sepolia compatibility

Farcaster Mini Apps work with any EVM chain. The SDK's `getEthereumProvider()` returns a standard EIP-1193 provider. We configure it to use Sepolia (chainId 11155111) just like our current setup. Users in Warpcast will be prompted to switch to Sepolia if needed.

## Testing

1. **Local dev**: Use `ngrok` or `cloudflared` to expose localhost, then use Warpcast's embed debugger
2. **Vercel preview**: Deploy to Vercel preview URL, test in Warpcast developer tools
3. **Production**: Deploy to main Vercel URL, submit to Farcaster Mini App directory

## Account association setup

To register as a Mini App, you need to sign a domain association with your Farcaster account:

1. Go to https://farcaster.xyz/~/settings/developer-tools
2. Enable Developer Mode
3. Go to Mini Apps section → Create new manifest
4. Enter your Vercel domain
5. Sign the association — this generates the `accountAssociation` JSON
6. Paste it into `public/.well-known/farcaster.json`
