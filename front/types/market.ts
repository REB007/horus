export interface Market {
  address: string;
  question: string;
  resolutionTime: number;
  resolved: boolean;
  yesWins?: boolean;
  yesReserve: string;
  noReserve: string;
  totalVolume: string;
  createdAt: number;
}

export interface MarketPrice {
  yesPrice: number;
  noPrice: number;
  yesReserve: string;
  noReserve: string;
}

export interface Position {
  marketAddress: string;
  question: string;
  yesBalance: string;
  noBalance: string;
  lpBalance: string;
  currentValue: string;
}

export interface ClaimableWinning {
  marketAddress: string;
  question: string;
  yesWins: boolean;
  winningTokenBalance: string;
  claimableAmount: string;
}

export interface TxData {
  to: string;
  data: string;
  value?: string;
}
