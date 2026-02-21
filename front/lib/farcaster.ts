import { sdk } from '@farcaster/miniapp-sdk';

/**
 * Detect if the app is running inside a Farcaster Mini App host (Warpcast).
 * The SDK sets up a postMessage channel — if we're in an iframe/WebView
 * with a Farcaster host, context will be available.
 */
export function isInMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  // The SDK is injected via postMessage in Warpcast's WebView
  // Check for the parent frame or the sdk context
  try {
    return window !== window.parent || !!window.ReactNativeWebView;
  } catch {
    // Cross-origin iframe — likely a Mini App host
    return true;
  }
}

/**
 * Initialize the Farcaster Mini App SDK.
 * Call this once on app mount. It signals to the host that the app is ready.
 */
export async function initFarcasterSDK() {
  if (!isInMiniApp()) return null;

  try {
    const context = await sdk.context;
    // Signal to the host that the app is loaded and ready to display
    await sdk.actions.ready();
    return context;
  } catch (e) {
    console.warn('[farcaster] SDK init failed:', e);
    return null;
  }
}

/**
 * Prompt the user to compose a cast (post) with the given text and embed URL.
 */
export async function shareCast(text: string, embedUrl?: string) {
  if (!isInMiniApp()) {
    // Fallback: open Warpcast compose in a new tab
    const params = new URLSearchParams({ text });
    if (embedUrl) params.set('embeds[]', embedUrl);
    window.open(`https://warpcast.com/~/compose?${params.toString()}`, '_blank');
    return;
  }

  try {
    await sdk.actions.composeCast({
      text,
      embeds: embedUrl ? [embedUrl] : [],
    });
  } catch (e) {
    console.warn('[farcaster] composeCast failed:', e);
  }
}

/**
 * Prompt the user to add this Mini App to their Farcaster client.
 */
export async function promptAddMiniApp() {
  if (!isInMiniApp()) return;
  try {
    await sdk.actions.addMiniApp();
  } catch (e) {
    console.warn('[farcaster] addMiniApp failed:', e);
  }
}

/**
 * Get the Farcaster EIP-1193 Ethereum provider for wallet interactions.
 * Returns null if not in a Mini App context.
 */
export function getFarcasterEthProvider() {
  if (!isInMiniApp()) return null;
  try {
    return sdk.wallet.ethProvider;
  } catch {
    return null;
  }
}

export { sdk };
