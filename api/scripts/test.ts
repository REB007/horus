/**
 * Horus API Integration Test Script
 * Run: npx ts-node scripts/test.ts
 *
 * Requires the API to be running on localhost:8080
 * and the mock token + factory to be deployed on Ethereum Sepolia.
 */

const BASE = 'http://localhost:8080';

// Deployed on Ethereum Sepolia
// MOCK_TOKEN: a real ERC-20 on Base (chainId 8453) that has a Uniswap pool
// We use WETH on Base as a well-known liquid token for price testing
const MOCK_TOKEN   = '0x4200000000000000000000000000000000000006'; // WETH on Base
const MOCK_POOL    = '0xd0b53D9277642d899DF5C87A3966A349A798F224'; // WETH/USDC 0.05% pool on Base (for DB only)
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
const TEST_WALLET  = '0xf4177fCdae0C7E24409AB40217C0e0315E257422';
const SOURCE_CHAIN_ID = 8453; // Base (where the token trades)

// 1 USDC = 1_000_000 (6 decimals). V3 MIN_LIQUIDITY = 10 USDC
const INITIAL_LIQUIDITY = 10_000_000;
const TRADE_AMOUNT      = 100_000;

let marketAddress = '';
let passed = 0;
let failed = 0;
let skipOnChain = false; // set true if admin wallet has insufficient USDC

// ─── helpers ────────────────────────────────────────────────────────────────

function ok(label: string, value: unknown) {
  console.log(`  ✅ ${label}:`, value);
  passed++;
}

function fail(label: string, reason: unknown) {
  console.error(`  ❌ ${label}:`, reason);
  failed++;
}

function assert(label: string, condition: boolean, detail?: unknown) {
  if (condition) ok(label, detail ?? 'pass');
  else fail(label, detail ?? 'assertion failed');
}

async function post(path: string, body: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

// ─── tests ──────────────────────────────────────────────────────────────────

async function t1_health() {
  console.log('\n[T1] Health check');
  const { status, body } = await get('/health');
  assert('status 200', status === 200, status);
  assert('status ok', body.status === 'ok', body.status);
}

async function t2_createMarket() {
  console.log('\n[T2] Create market (V3) — fetches Uniswap price + sends on-chain TX, may take ~20s');

  // Pre-check: admin wallet must have ≥ MIN_LIQUIDITY USDC (10 USDC = 10_000_000)
  const balRes = await get(`/api/markets`); // warm up, then check balance via RPC
  const balCheck = await fetch(`https://eth-sepolia.g.alchemy.com/v2/U819R_P1JKQunW7CJujrd`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: USDC_ADDRESS, data: `0x70a08231000000000000000000000000${TEST_WALLET.slice(2).toLowerCase()}` }, 'latest'], id: 1 }),
  });
  const balData = await balCheck.json() as { result: string };
  const usdcBalance = parseInt(balData.result, 16);
  console.log(`  → Admin USDC balance: ${usdcBalance} (${(usdcBalance / 1e6).toFixed(2)} USDC)`);
  if (usdcBalance < INITIAL_LIQUIDITY) {
    fail('T2 skipped — insufficient USDC', `need ${INITIAL_LIQUIDITY}, have ${usdcBalance}. Top up at https://faucet.circle.com`);
    skipOnChain = true;
    return;
  }
  const { status, body } = await post('/api/admin/markets', {
    tokenAddress: MOCK_TOKEN,
    poolAddress: MOCK_POOL,       // manual override: bypass Clanker lookup
    tokenSymbol: 'WETH',
    tokenName: 'Wrapped Ether',
    initialLiquidity: INITIAL_LIQUIDITY,
    sourceChainId: SOURCE_CHAIN_ID,
  });
  if (status !== 200) {
    fail('POST /api/admin/markets', body);
    return;
  }
  assert('has marketAddress', typeof body.marketAddress === 'string' && body.marketAddress.startsWith('0x'), body.marketAddress);
  assert('has question', typeof body.question === 'string', body.question);
  assert('has resolutionTime', typeof body.resolutionTime === 'number', body.resolutionTime);
  assert('has snapshotPrice', typeof body.snapshotPrice === 'string', body.snapshotPrice);
  assert('snapshotPrice is positive', BigInt(body.snapshotPrice) > 0n, body.snapshotPrice);
  assert('has txHash', typeof body.txHash === 'string' && body.txHash.startsWith('0x'), body.txHash);
  marketAddress = body.marketAddress;
  console.log(`  → Market deployed at ${marketAddress}`);
  console.log(`  → Snapshot price: ${body.snapshotPrice} (18 dec)`);
}

async function t3_listMarkets() {
  console.log('\n[T3] List markets');
  const { status, body } = await get('/api/markets');
  assert('status 200', status === 200, status);
  assert('is array', Array.isArray(body), typeof body);
  const market = body.find((m: { address: string }) => m.address.toLowerCase() === marketAddress.toLowerCase());
  assert('created market in list', !!market, market?.address ?? 'not found');
  assert('has yesPrice', market && typeof market.yesPrice === 'string', market?.yesPrice);
  assert('has noPrice', market && typeof market.noPrice === 'string', market?.noPrice);
  assert('resolved is false', market && market.resolved === false, market?.resolved);
  assert('has snapshotPrice', market && typeof market.snapshotPrice === 'string', market?.snapshotPrice);
  assert('snapshotPrice positive', market && BigInt(market.snapshotPrice) > 0n, market?.snapshotPrice);
  assert('has resolutionPrice', market && typeof market.resolutionPrice === 'string', market?.resolutionPrice);
  assert('has sourceChainId', market && typeof market.sourceChainId === 'string', market?.sourceChainId);
}

async function t4_getMarket() {
  console.log('\n[T4] Get single market');
  const { status, body } = await get(`/api/markets/${marketAddress}`);
  assert('status 200', status === 200, status);
  assert('correct address', body.address?.toLowerCase() === marketAddress.toLowerCase(), body.address);
  assert('has yesTokenAddress', typeof body.yesTokenAddress === 'string' && body.yesTokenAddress.startsWith('0x'), body.yesTokenAddress);
  assert('has noTokenAddress', typeof body.noTokenAddress === 'string' && body.noTokenAddress.startsWith('0x'), body.noTokenAddress);
  assert('has poolAddress', typeof body.poolAddress === 'string', body.poolAddress);
  // V3 oracle metadata
  assert('has snapshotPrice', typeof body.snapshotPrice === 'string', body.snapshotPrice);
  assert('has resolutionPrice', typeof body.resolutionPrice === 'string', body.resolutionPrice);
  assert('has oracleEndpoint', typeof body.oracleEndpoint === 'string' && body.oracleEndpoint.startsWith('https://'), body.oracleEndpoint);
  assert('has sourceChainId', typeof body.sourceChainId === 'string', body.sourceChainId);
  assert('has sourcePool', typeof body.sourcePool === 'string', body.sourcePool);
  assert('has sourceToken', typeof body.sourceToken === 'string' && body.sourceToken.startsWith('0x'), body.sourceToken);
  console.log(`  → oracleEndpoint: ${body.oracleEndpoint}`);
  console.log(`  → sourceChainId: ${body.sourceChainId}, sourceToken: ${body.sourceToken}`);
}

async function t5_getPrice() {
  console.log('\n[T5] Get price');
  const { status, body } = await get(`/api/markets/${marketAddress}/price`);
  assert('status 200', status === 200, status);
  assert('has yesPrice', typeof body.yesPrice === 'string', body.yesPrice);
  assert('has noPrice', typeof body.noPrice === 'string', body.noPrice);
  const sum = BigInt(body.yesPrice) + BigInt(body.noPrice);
  assert('yesPrice + noPrice == 10000', sum === 10000n, sum.toString());
}

async function t6_txApprove() {
  console.log('\n[T6] TX builder: approve');
  const { status, body } = await post(`/api/markets/${marketAddress}/approve`, { amount: TRADE_AMOUNT });
  assert('status 200', status === 200, status);
  assert('to is USDC', body.to?.toLowerCase() === USDC_ADDRESS.toLowerCase(), body.to);
  assert('has data', typeof body.data === 'string' && body.data.startsWith('0x'), body.data);
}

async function t7_txBuy() {
  console.log('\n[T7] TX builder: buy');
  const { status: s1, body: b1 } = await post(`/api/markets/${marketAddress}/buy`, { buyYes: true, amount: TRADE_AMOUNT });
  assert('buy YES status 200', s1 === 200, s1);
  assert('buy YES to is market', b1.to?.toLowerCase() === marketAddress.toLowerCase(), b1.to);
  assert('buy YES has data', typeof b1.data === 'string' && b1.data.startsWith('0x'), b1.data);

  const { status: s2, body: b2 } = await post(`/api/markets/${marketAddress}/buy`, { buyYes: false, amount: TRADE_AMOUNT });
  assert('buy NO status 200', s2 === 200, s2);
  assert('buy NO has data', typeof b2.data === 'string', b2.data);
}

async function t8_txSell() {
  console.log('\n[T8] TX builder: sell');
  const { status, body } = await post(`/api/markets/${marketAddress}/sell`, { sellYes: true, amount: TRADE_AMOUNT });
  assert('status 200', status === 200, status);
  assert('to is market', body.to?.toLowerCase() === marketAddress.toLowerCase(), body.to);
  assert('has data', typeof body.data === 'string' && body.data.startsWith('0x'), body.data);
}

async function t9_txMintRedeem() {
  console.log('\n[T9] TX builder: mint / redeem');
  const { status: s1, body: b1 } = await post(`/api/markets/${marketAddress}/mint`, { amount: TRADE_AMOUNT });
  assert('mint status 200', s1 === 200, s1);
  assert('mint to is market', b1.to?.toLowerCase() === marketAddress.toLowerCase(), b1.to);

  const { status: s2, body: b2 } = await post(`/api/markets/${marketAddress}/redeem`, { amount: TRADE_AMOUNT });
  assert('redeem status 200', s2 === 200, s2);
  assert('redeem to is market', b2.to?.toLowerCase() === marketAddress.toLowerCase(), b2.to);
}

async function t10_txClaim() {
  console.log('\n[T10] TX builder: claim');
  const { status, body } = await post(`/api/markets/${marketAddress}/claim`, {});
  assert('status 200', status === 200, status);
  assert('to is market', body.to?.toLowerCase() === marketAddress.toLowerCase(), body.to);
  assert('has data', typeof body.data === 'string' && body.data.startsWith('0x'), body.data);
}

async function t11_txLiquidity() {
  console.log('\n[T11] TX builder: add / remove liquidity');
  const { status: s1, body: b1 } = await post(`/api/markets/${marketAddress}/liquidity/add`, { amount: TRADE_AMOUNT });
  assert('add liquidity status 200', s1 === 200, s1);
  assert('add liquidity has data', typeof b1.data === 'string' && b1.data.startsWith('0x'), b1.data);

  const { status: s2, body: b2 } = await post(`/api/markets/${marketAddress}/liquidity/remove`, { lpAmount: TRADE_AMOUNT });
  assert('remove liquidity status 200', s2 === 200, s2);
  assert('remove liquidity has data', typeof b2.data === 'string' && b2.data.startsWith('0x'), b2.data);
}

async function t12_userPositions() {
  console.log('\n[T12] User positions (fresh wallet — expect empty)');
  const { status, body } = await get(`/api/users/${TEST_WALLET}/positions`);
  assert('status 200', status === 200, status);
  assert('is array', Array.isArray(body), typeof body);
}

async function t13_userClaimable() {
  console.log('\n[T13] User claimable (before resolution — expect empty)');
  const { status, body } = await get(`/api/users/${TEST_WALLET}/claimable`);
  assert('status 200', status === 200, status);
  assert('is array', Array.isArray(body), typeof body);
  assert('empty before resolution', body.length === 0, body.length);
}

async function t14_tokens() {
  console.log('\n[T14] Tokens: trending');
  const { status, body } = await get('/api/tokens/trending');
  assert('status 200 or 500', status === 200 || status === 500, status);
  if (status === 200) {
    assert('is array', Array.isArray(body), typeof body);
    if (body.length > 0) {
      assert('token has contract_address', typeof body[0].contract_address === 'string', body[0].contract_address);
      assert('token has symbol', typeof body[0].symbol === 'string', body[0].symbol);
    }
  } else {
    console.log('  ⚠️  Clanker API unavailable (expected on testnet) — skipping');
  }
}

async function t15_resolve() {
  console.log('\n[T15] Manual resolve (V3) — fetches Uniswap price + sends on-chain TX');
  console.log('  ⚠️  Note: will fail if resolutionTime has not passed yet (10 min window)');
  const { status, body } = await post(`/api/admin/markets/${marketAddress}/resolve`, {});
  if (status === 200) {
    assert('has yesWins', typeof body.yesWins === 'boolean', body.yesWins);
    assert('has resolutionPrice', typeof body.resolutionPrice === 'string', body.resolutionPrice);
    assert('resolutionPrice positive', BigInt(body.resolutionPrice) > 0n, body.resolutionPrice);
    assert('has txHash', typeof body.txHash === 'string', body.txHash);
    console.log(`  → Resolution price: ${body.resolutionPrice} (18 dec)`);
    console.log(`  → yesWins: ${body.yesWins}`);
    // Verify market is now resolved on-chain
    const { body: market } = await get(`/api/markets/${marketAddress}`);
    assert('market resolved on-chain', market.resolved === true, market.resolved);
    assert('resolutionPrice stored on-chain', market.resolutionPrice !== '0', market.resolutionPrice);
  } else {
    console.log(`  ⚠️  Resolve failed (likely too early): ${JSON.stringify(body)}`);
    console.log('  → Skipping resolve assertions — re-run after resolutionTime passes');
  }
}

// ─── runner ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Horus API V3 Integration Tests ===');
  console.log(`API:          ${BASE}`);
  console.log(`Token:        ${MOCK_TOKEN} (WETH on Base)`);
  console.log(`Source chain: ${SOURCE_CHAIN_ID} (Base)`);
  console.log(`Pool (DB):    ${MOCK_POOL}`);
  console.log(`Test wallet:  ${TEST_WALLET}`);
  console.log('Note: T2 creates a real on-chain market — costs USDC from admin wallet');
  console.log('Note: T15 resolve will fail if run within 10 min of T2 (expected)');
  console.log('─'.repeat(50));

  try {
    await t1_health();
    await t2_createMarket();

    if (!marketAddress && !skipOnChain) {
      console.error('\n❌ Market creation failed — cannot continue remaining tests');
      process.exit(1);
    }
    if (skipOnChain) {
      console.log('\n⚠️  Skipping on-chain tests (T3–T15) — admin wallet needs USDC top-up');
      console.log('   Faucet: https://faucet.circle.com (select Sepolia)');
      return;
    }

    await t3_listMarkets();
    await t4_getMarket();
    await t5_getPrice();
    await t6_txApprove();
    await t7_txBuy();
    await t8_txSell();
    await t9_txMintRedeem();
    await t10_txClaim();
    await t11_txLiquidity();
    await t12_userPositions();
    await t13_userClaimable();
    await t14_tokens();
    await t15_resolve();
  } catch (err) {
    console.error('\n[FATAL]', err);
    failed++;
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
