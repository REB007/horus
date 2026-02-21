import { Router, Request, Response } from 'express';
import { parseEventLogs } from 'viem';
import { publicClient, walletClient, adminAccount } from '../services/chain';
import { getTokenByAddress } from '../services/clanker';
import { getUniswapPrice } from '../services/uniswap';
import { insertMarket, getMarket, markResolved } from '../db';
import { config } from '../config';
import MarketFactoryV3Abi from '../abi/MarketFactoryV3.json';
import PredictionMarketV3Abi from '../abi/PredictionMarketV3.json';

const router = Router();

router.post('/markets', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, initialLiquidity, poolAddress, tokenSymbol, tokenName, sourceChainId: reqChainId } = req.body;
    if (!tokenAddress || !initialLiquidity) {
      return res.status(400).json({ error: 'tokenAddress and initialLiquidity required' });
    }

    let resolvedSymbol: string;
    let resolvedName: string;
    let resolvedImg: string | null = null;
    const sourceChainId = reqChainId ? Number(reqChainId) : 8453; // default Base

    // sourcePool is metadata only — V3 resolves via Uniswap API, not on-chain pool reads.
    // Use tokenAddress as sourcePool (Clanker pool_address is a 32-byte ID, not an EVM address).
    const resolvedPoolAddress = tokenAddress;

    if (tokenSymbol) {
      // Manual override — bypass Clanker (used for testing or when frontend sends symbol/name)
      resolvedSymbol = tokenSymbol;
      resolvedName = tokenName || tokenSymbol;
    } else {
      // Fetch token info from Clanker
      const token = await getTokenByAddress(tokenAddress);
      if (!token) return res.status(404).json({ error: 'Token not found on Clanker' });

      resolvedSymbol = token.symbol;
      resolvedName = token.name;
      resolvedImg = token.img_url;
    }

    // Fetch snapshot price from Uniswap API
    const snapshotPrice = await getUniswapPrice(sourceChainId, tokenAddress);
    const oracleEndpoint = 'https://api.uniswap.org/v2/quote';

    // Build market params
    const question = `Will $${resolvedSymbol} be UP in 10 min?`;
    const resolutionTime = BigInt(Math.floor(Date.now() / 1000) + 600);
    const liquidityBigInt = BigInt(initialLiquidity);

    // Approve factory to spend USDC (V3 pulls from msg.sender)
    const erc20Abi = [
      { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
    ] as const;
    const approveHash = await walletClient.writeContract({
      account: adminAccount,
      address: config.usdcAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [config.factoryAddress, liquidityBigInt],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Sign + send createMarket tx (V3: oracle metadata + snapshotPrice)
    const hash = await walletClient.writeContract({
      account: adminAccount,
      address: config.factoryAddress,
      abi: MarketFactoryV3Abi,
      functionName: 'createMarket',
      args: [
        question,
        resolutionTime,
        liquidityBigInt,
        oracleEndpoint,
        BigInt(sourceChainId),
        resolvedPoolAddress as `0x${string}`,
        tokenAddress as `0x${string}`,
        snapshotPrice,
      ],
    });

    // Wait for receipt and extract market address from MarketCreated event
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const logs = parseEventLogs({
      abi: MarketFactoryV3Abi,
      logs: receipt.logs,
      eventName: 'MarketCreated',
    });

    if (!logs.length) return res.status(500).json({ error: 'MarketCreated event not found in receipt' });
    const marketAddress = (logs[0] as unknown as { args: { market: string } }).args.market;

    // Insert into DB
    insertMarket({
      address: marketAddress,
      token_address: tokenAddress,
      token_symbol: resolvedSymbol,
      token_name: resolvedName,
      token_img: resolvedImg,
      pool_address: resolvedPoolAddress,
      question,
      resolution_time: Number(resolutionTime),
      created_at: Math.floor(Date.now() / 1000),
      tx_hash: hash,
      source_chain_id: sourceChainId,
      source_pool: resolvedPoolAddress,
      source_token: tokenAddress,
      oracle_endpoint: oracleEndpoint,
      snapshot_price: snapshotPrice.toString(),
    });

    res.json({ marketAddress, question, resolutionTime: Number(resolutionTime), snapshotPrice: snapshotPrice.toString(), txHash: hash });
  } catch (err) {
    console.error('[admin] createMarket error:', err);
    res.status(500).json({ error: String(err) });
  }
});

router.post('/markets/:address/resolve', async (req: Request, res: Response) => {
  try {
    const addr = req.params.address as `0x${string}`;
    const row = getMarket(addr);
    if (!row) return res.status(404).json({ error: 'Market not found in DB' });

    // Read oracle metadata to fetch current price
    const [sourceChainId, sourceToken] = await Promise.all([
      publicClient.readContract({ address: addr, abi: PredictionMarketV3Abi, functionName: 'sourceChainId' }),
      publicClient.readContract({ address: addr, abi: PredictionMarketV3Abi, functionName: 'sourceToken' }),
    ]);

    const resolutionPrice = await getUniswapPrice(
      Number(sourceChainId as bigint),
      sourceToken as string,
    );

    const hash = await walletClient.writeContract({
      account: adminAccount,
      address: addr,
      abi: PredictionMarketV3Abi,
      functionName: 'resolve',
      args: [resolutionPrice],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    const yesWins = await publicClient.readContract({
      address: addr,
      abi: PredictionMarketV3Abi,
      functionName: 'yesWins',
    }) as boolean;

    markResolved(addr, yesWins);
    res.json({ marketAddress: addr, yesWins, resolutionPrice: resolutionPrice.toString(), txHash: hash });
  } catch (err) {
    console.error('[admin] resolve error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Price check — frontend calls this when user selects a token to verify Uniswap can price it
router.get('/price-check/:chainId/:tokenAddress', async (req: Request, res: Response) => {
  try {
    const chainId = Number(req.params.chainId);
    const tokenAddress = req.params.tokenAddress;
    const price = await getUniswapPrice(chainId, tokenAddress);
    res.json({ price: price.toString(), priceUsd: (Number(price) / 1e18).toFixed(6) });
  } catch (err) {
    res.status(400).json({ error: 'No price available for this token on Uniswap', detail: String(err) });
  }
});

export default router;
