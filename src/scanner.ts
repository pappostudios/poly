import { ClobClient, Side } from "@polymarket/clob-client";
import { BinaryMarket, ArbitrageOpportunity } from "./types";
import { config } from "./config";
import { logger } from "./logger";

export async function scanForArbitrage(
  client: ClobClient,
  markets: BinaryMarket[],
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = [];

  // Process in batches to stay within API rate limits
  for (let i = 0; i < markets.length; i += config.bookBatchSize) {
    const batch = markets.slice(i, i + config.bookBatchSize);

    // Build params for YES and NO books interleaved (SELL side = ask prices for buyers)
    const params = batch.flatMap((m) => [
      { token_id: m.yesTokenId, side: Side.SELL },
      { token_id: m.noTokenId, side: Side.SELL },
    ]);

    let books: Awaited<ReturnType<typeof client.getOrderBooks>>;
    try {
      books = await client.getOrderBooks(params);
    } catch (err) {
      logger.warn("Order book batch fetch failed", { batchStart: i, error: String(err) });
      continue;
    }

    // books comes back as an array aligned with params
    for (let j = 0; j < batch.length; j++) {
      const market = batch[j];
      const yesBook = books[j * 2];
      const noBook = books[j * 2 + 1];

      if (!yesBook || !noBook) continue;
      if (!yesBook.asks?.length || !noBook.asks?.length) continue;

      // asks are sorted ascending — index 0 is the cheapest (best) ask
      const bestAskYes = parseFloat(yesBook.asks[0].price);
      const bestAskNo = parseFloat(noBook.asks[0].price);

      if (isNaN(bestAskYes) || isNaN(bestAskNo)) continue;

      const grossCost = bestAskYes + bestAskNo;
      const netProfit = 1.0 - grossCost - config.estimatedFeeFraction;

      if (netProfit >= config.minProfitThreshold) {
        opportunities.push({
          market,
          bestAskYes,
          bestAskNo,
          grossCost,
          netProfit,
          tradeSize: config.tradeSize,
          detectedAt: new Date(),
        });
      }
    }
  }

  return opportunities;
}
