import { config } from '../config';

const UNISWAP_API_BASE = 'https://trade-api.gateway.uniswap.org/v1';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

const USDC_ADDRESSES: Record<number, string> = {
  1:        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  8453:     '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

const WETH_ADDRESSES: Record<number, string> = {
  1:    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  8453: '0x4200000000000000000000000000000000000006',
};

/**
 * Fetch the current USD price of a token via Uniswap Developer API.
 * Returns price as int256-compatible bigint with 18 decimals.
 * Falls back to token→WETH→USDC routing if direct quote unavailable.
 */
export async function getUniswapPrice(
  chainId: number,
  tokenAddress: string
): Promise<bigint> {
  const usdcAddress = USDC_ADDRESSES[chainId];
  if (!usdcAddress) throw new Error(`No USDC address for chainId ${chainId}`);

  // Try direct token → USDC quote first
  // quoteWithRetry returns raw output bigint in tokenOut's native decimals
  // For USDC (6 dec): divide by 1e6 to get float USD, then floatToInt256 for 18-dec result
  try {
    const rawUsdc6 = await quoteWithRetry(chainId, tokenAddress, usdcAddress, 10n ** 18n);
    const priceFloat = Number(rawUsdc6) / 1e6;
    if (isNaN(priceFloat) || priceFloat <= 0) throw new Error(`Invalid price: ${priceFloat}`);
    return floatToInt256(priceFloat);
  } catch (err: unknown) {
    const msg = String(err);
    // 404 = no direct pool; try token → WETH → USDC two-hop
    if (msg.includes('404') || msg.includes('No quotes')) {
      const wethAddress = WETH_ADDRESSES[chainId];
      if (!wethAddress) throw new Error(`No price available for token on chainId ${chainId}`);

      console.log(`[uniswap] No direct USDC pool — trying ${tokenAddress} → WETH → USDC`);

      // Step 1: 1e18 token → WETH (output in WETH 18 dec)
      const wethOut18 = await quoteWithRetry(chainId, tokenAddress, wethAddress, 10n ** 18n);
      // Step 2: wethOut18 WETH → USDC (output in USDC 6 dec)
      const usdcOut6 = await quoteWithRetry(chainId, wethAddress, usdcAddress, wethOut18);

      const priceFloat = Number(usdcOut6) / 1e6;
      if (isNaN(priceFloat) || priceFloat <= 0) {
        throw new Error(`Invalid two-hop price: ${priceFloat}`);
      }
      return floatToInt256(priceFloat);
    }
    throw err;
  }
}

/**
 * Single quote call with retry on 504 timeout and AbortController timeout.
 * Returns the raw USDC output as a bigint (6 decimals).
 */
async function quoteWithRetry(
  chainId: number,
  tokenIn: string,
  tokenOut: string,
  amount: bigint,
  attempt = 0
): Promise<bigint> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const payload = {
    type: 'EXACT_INPUT',
    tokenInChainId: chainId,
    tokenOutChainId: chainId,
    tokenIn,
    tokenOut,
    amount: amount.toString(),
    routingPreference: 'BEST_PRICE',
    swapper: '0x0000000000000000000000000000000000000001',
  };

  let res: Response;
  try {
    res = await fetch(`${UNISWAP_API_BASE}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.uniswapApiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (fetchErr: unknown) {
    clearTimeout(timer);
    // AbortError = our timeout fired
    if (attempt < MAX_RETRIES) {
      console.log(`[uniswap] Request timed out, retrying (${attempt + 1}/${MAX_RETRIES})…`);
      await sleep(1000 * (attempt + 1));
      return quoteWithRetry(chainId, tokenIn, tokenOut, amount, attempt + 1);
    }
    throw new Error(`Uniswap API timed out after ${MAX_RETRIES + 1} attempts`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    // Retry on 504 gateway timeout
    if (res.status === 504 && attempt < MAX_RETRIES) {
      console.log(`[uniswap] 504 gateway timeout, retrying (${attempt + 1}/${MAX_RETRIES})…`);
      await sleep(1500 * (attempt + 1));
      return quoteWithRetry(chainId, tokenIn, tokenOut, amount, attempt + 1);
    }
    throw new Error(`Uniswap API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    quote: {
      output?: { amount?: string };
      outputAmount?: string;
      quoteDecimals?: string;
    }
  };

  // quote.output.amount = raw output token units (CLASSIC routing)
  const rawOut =
    data.quote?.output?.amount ??
    data.quote?.outputAmount ??
    data.quote?.quoteDecimals;

  if (!rawOut) {
    throw new Error(`Unexpected Uniswap API response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // If quoteDecimals it's a human-readable float — convert to 6-dec bigint for consistency
  if (data.quote?.quoteDecimals !== undefined) {
    const f = parseFloat(rawOut);
    return BigInt(Math.round(f * 1e6));
  }

  return BigInt(rawOut);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Convert a float price to int256 with 18 decimal places */
function floatToInt256(price: number): bigint {
  // Use string manipulation to avoid floating point errors
  const [whole, frac = ''] = price.toString().split('.');
  const padded = (frac + '0'.repeat(18)).slice(0, 18);
  return BigInt(whole + padded);
}
