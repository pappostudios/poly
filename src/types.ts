export interface BinaryMarket {
  conditionId: string;
  question: string;
  yesTokenId: string;
  noTokenId: string;
  tickSize: string;
  negRisk: boolean;
}

export interface ArbitrageOpportunity {
  market: BinaryMarket;
  bestAskYes: number;
  bestAskNo: number;
  grossCost: number;
  netProfit: number;
  tradeSize: number;
  detectedAt: Date;
}

export interface Position {
  id: string;
  market: BinaryMarket;
  opportunity: ArbitrageOpportunity;
  yesOrderId: string;
  noOrderId: string;
  yesFilledPrice: number;
  noFilledPrice: number;
  sizeShares: number;
  entryTimestamp: Date;
  status: "open" | "closed" | "partial";
  realizedPnl?: number;
}

export interface BotStats {
  scansCompleted: number;
  opportunitiesFound: number;
  ordersPlaced: number;
  totalPnl: number;
  openPositions: number;
}
