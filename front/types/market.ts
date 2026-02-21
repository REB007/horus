export interface Market {
  address: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenImg: string | null;
  poolAddress: string;
  question: string;
  resolutionTime: number;
  resolved: boolean;
  yesWins?: boolean;
  yesReserve: string;
  noReserve: string;
  yesPrice: string;
  noPrice: string;
  snapshotPrice: string;
  resolutionPrice: string;
  oracleEndpoint: string;
  sourceChainId: string;
  sourcePool: string;
  sourceToken: string;
  yesTokenAddress: string;
  noTokenAddress: string;
  createdAt: number;
  txHash: string | null;
}

export interface MarketPrice {
  yesPrice: string;
  noPrice: string;
}

export interface Position {
  marketAddress: string;
  tokenSymbol: string;
  question: string;
  resolved: boolean;
  yesWins?: boolean;
  yesBalance: string;
  noBalance: string;
  lpBalance: string;
}

export interface ClaimableWinning {
  marketAddress: string;
  tokenSymbol: string;
  question: string;
  yesWins: boolean;
  claimableAmount: string;
}

export interface TxData {
  to: string;
  data: string;
  value?: string;
}

export interface ClankerToken {
  contract_address: string;
  name: string;
  symbol: string;
  img_url: string | null;
  pool_address: string;
  market_cap: number | null;
  volumeUSD?: number;
  totalValueLockedUSD?: number;
}
