import { ClobClient } from "@polymarket/clob-client";
import { BinaryMarket } from "./types";
import { logger } from "./logger";

const END_CURSOR = "LTE=";
const INITIAL_CURSOR = "MA==";

export async function getActiveBinaryMarkets(client: ClobClient): Promise<BinaryMarket[]> {
  const markets: BinaryMarket[] = [];
  let cursor = INITIAL_CURSOR;

  while (true) {
    const page = await client.getMarkets(cursor);

    for (const m of page.data ?? []) {
      // skip neg_risk (multi-outcome) and markets without exactly 2 tokens
      if (m.neg_risk) continue;
      if (!Array.isArray(m.tokens) || m.tokens.length !== 2) continue;

      const yesToken = m.tokens.find((t: { outcome: string }) => t.outcome === "Yes");
      const noToken = m.tokens.find((t: { outcome: string }) => t.outcome === "No");
      if (!yesToken || !noToken) continue;

      markets.push({
        conditionId: m.condition_id,
        question: m.question ?? m.condition_id,
        yesTokenId: yesToken.token_id,
        noTokenId: noToken.token_id,
        tickSize: m.minimum_tick_size ?? "0.01",
        negRisk: false,
      });
    }

    if (!page.next_cursor || page.next_cursor === END_CURSOR) break;
    cursor = page.next_cursor;
  }

  logger.info("Markets loaded", { count: markets.length });
  return markets;
}
