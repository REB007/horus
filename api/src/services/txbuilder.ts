import { encodeFunctionData } from 'viem';
import PredictionMarketV2Abi from '../abi/PredictionMarketV2.json';

export interface TxData {
  to: string;
  data: string;
  value: string;
}

export function buildBuy(marketAddress: string, buyYes: boolean, amount: bigint): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'buy', args: [buyYes, amount] }),
    value: '0',
  };
}

export function buildSell(marketAddress: string, sellYes: boolean, tokenAmount: bigint): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'sell', args: [sellYes, tokenAmount] }),
    value: '0',
  };
}

export function buildMint(marketAddress: string, usdcAmount: bigint): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'mint', args: [usdcAmount] }),
    value: '0',
  };
}

export function buildRedeem(marketAddress: string, amount: bigint): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'redeem', args: [amount] }),
    value: '0',
  };
}

export function buildClaim(marketAddress: string): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'claim', args: [] }),
    value: '0',
  };
}

export function buildAddLiquidity(marketAddress: string, usdcAmount: bigint): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'addLiquidity', args: [usdcAmount] }),
    value: '0',
  };
}

export function buildRemoveLiquidity(marketAddress: string, lpAmount: bigint): TxData {
  return {
    to: marketAddress,
    data: encodeFunctionData({ abi: PredictionMarketV2Abi, functionName: 'removeLiquidity', args: [lpAmount] }),
    value: '0',
  };
}

// ERC-20 approve calldata (for USDC → market)
const erc20Abi = [
  { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
] as const;

export function buildApprove(tokenAddress: string, spender: string, amount: bigint): TxData {
  return {
    to: tokenAddress,
    data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [spender as `0x${string}`, amount] }),
    value: '0',
  };
}
