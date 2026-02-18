export interface ClankerToken {
  contract_address: string;
  name: string;
  symbol: string;
  img_url: string | null;
  pool_address: string;
  market_cap: number | null;
}

interface ClankerApiToken {
  contract_address: string;
  name: string;
  symbol: string;
  img_url?: string;
  pool_address?: string;
  related?: { market?: { marketCap?: number } };
}

interface ClankerApiResponse {
  data: ClankerApiToken[];
}

const CLANKER_BASE = 'https://www.clanker.world/api/tokens';
const CACHE_TTL_MS = 30_000;

let trendingCache: { tokens: ClankerToken[]; fetchedAt: number } | null = null;

export async function getTrendingTokens(): Promise<ClankerToken[]> {
  if (trendingCache && Date.now() - trendingCache.fetchedAt < CACHE_TTL_MS) {
    return trendingCache.tokens;
  }

  const url = `${CLANKER_BASE}?chainId=8453&includeMarket=true&sortBy=market-cap&sort=desc&limit=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Clanker API error: ${res.status}`);

  const json = (await res.json()) as ClankerApiResponse;
  const tokens = (json.data || []).map(normalise).filter((t) => t.pool_address !== '');

  trendingCache = { tokens, fetchedAt: Date.now() };
  return tokens;
}

export async function getTokenByAddress(address: string): Promise<ClankerToken | null> {
  const trending = await getTrendingTokens();
  const found = trending.find((t) => t.contract_address.toLowerCase() === address.toLowerCase());
  if (found) return found;

  // Fallback: direct lookup
  const url = `${CLANKER_BASE}?chainId=8453&includeMarket=true&address=${address}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const json = (await res.json()) as ClankerApiResponse;
  if (!json.data?.length) return null;
  return normalise(json.data[0]);
}

function normalise(t: ClankerApiToken): ClankerToken {
  return {
    contract_address: t.contract_address,
    name: t.name,
    symbol: t.symbol,
    img_url: t.img_url || null,
    pool_address: t.pool_address || '',
    market_cap: t.related?.market?.marketCap ?? null,
  };
}
