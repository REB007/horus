import { config } from '../config';

export interface SubgraphToken {
  contract_address: string;
  name: string;
  symbol: string;
  img_url: string | null;
  pool_address: string;
  market_cap: number | null;
  volumeUSD: number;
  totalValueLockedUSD: number;
  decimals: number;
}

// Uniswap V3 subgraph IDs per chain
const SUBGRAPH_IDS: Record<number, string> = {
  1:    '5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV', // Ethereum mainnet
  8453: '43Hwfi3dJSoGpyas9VwNoDAv55yjgGrPpNSmbQZArzMG', // Base
};

const CACHE_TTL_MS = 60_000; // 1 min cache
let cache: Record<number, { tokens: SubgraphToken[]; fetchedAt: number }> = {};

// Stablecoins and wrapped natives to exclude (boring to bet on)
const EXCLUDE_SYMBOLS = new Set([
  'USDC', 'USDT', 'DAI', 'USDC.e', 'USDbC', 'FRAX', 'LUSD', 'BUSD', 'TUSD', 'USDP',
  'WETH', 'WBTC', 'cbETH', 'rETH', 'stETH', 'wstETH', 'cbBTC',
]);

/**
 * Fetch top tokens by 24h volume from the Uniswap V3 subgraph on a given chain.
 * Returns tokens that have real on-chain liquidity.
 */
export async function getTopTokens(chainId: number = 8453): Promise<SubgraphToken[]> {
  const cached = cache[chainId];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.tokens;
  }

  const subgraphId = SUBGRAPH_IDS[chainId];
  if (!subgraphId) throw new Error(`No Uniswap V3 subgraph for chainId ${chainId}`);

  const apiKey = config.graphApiKey;
  if (!apiKey) throw new Error('GRAPH_API_KEY not set — get one free at thegraph.com/studio');

  const url = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;

  const query = `{
    tokens(
      first: 50
      orderBy: volumeUSD
      orderDirection: desc
      where: { volumeUSD_gt: "1000" }
    ) {
      id
      symbol
      name
      decimals
      volumeUSD
      totalValueLockedUSD
    }
  }`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data?: { tokens?: Array<{
      id: string;
      symbol: string;
      name: string;
      decimals: string;
      volumeUSD: string;
      totalValueLockedUSD: string;
    }> };
    errors?: Array<{ message: string }>;
  };

  if (json.errors?.length) {
    throw new Error(`Graph query error: ${json.errors[0].message}`);
  }

  const rawTokens = json.data?.tokens || [];

  const tokens: SubgraphToken[] = rawTokens
    .filter((t) => !EXCLUDE_SYMBOLS.has(t.symbol))
    .map((t) => ({
      contract_address: t.id,
      name: t.name,
      symbol: t.symbol,
      img_url: null, // subgraph doesn't have images
      pool_address: t.id, // use token address as pool reference
      market_cap: null,
      volumeUSD: parseFloat(t.volumeUSD),
      totalValueLockedUSD: parseFloat(t.totalValueLockedUSD),
      decimals: parseInt(t.decimals),
    }))
    .slice(0, 20);

  cache[chainId] = { tokens, fetchedAt: Date.now() };
  return tokens;
}

/**
 * Search for a specific token by address on the subgraph.
 */
export async function getTokenByAddressSubgraph(
  address: string,
  chainId: number = 8453
): Promise<SubgraphToken | null> {
  // Check cache first
  const cached = cache[chainId];
  if (cached) {
    const found = cached.tokens.find(
      (t) => t.contract_address.toLowerCase() === address.toLowerCase()
    );
    if (found) return found;
  }

  const subgraphId = SUBGRAPH_IDS[chainId];
  if (!subgraphId) return null;

  const apiKey = config.graphApiKey;
  if (!apiKey) return null;

  const url = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;

  const query = `{
    token(id: "${address.toLowerCase()}") {
      id
      symbol
      name
      decimals
      volumeUSD
      totalValueLockedUSD
    }
  }`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    data?: { token?: {
      id: string;
      symbol: string;
      name: string;
      decimals: string;
      volumeUSD: string;
      totalValueLockedUSD: string;
    } | null };
  };

  const t = json.data?.token;
  if (!t) return null;

  return {
    contract_address: t.id,
    name: t.name,
    symbol: t.symbol,
    img_url: null,
    pool_address: t.id,
    market_cap: null,
    volumeUSD: parseFloat(t.volumeUSD),
    totalValueLockedUSD: parseFloat(t.totalValueLockedUSD),
    decimals: parseInt(t.decimals),
  };
}
