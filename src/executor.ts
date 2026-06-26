import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { randomBytes } from "crypto";
import { ArbitrageOpportunity, Position } from "./types";
import { config } from "./config";
import { logger } from "./logger";

export async function executeArbitrage(
  client: ClobClient,
  opp: ArbitrageOpportunity,
): Promise<Position | null> {
  if (config.dryRun) {
    logger.info("DRY_RUN: would place orders", {
      question: opp.market.question,
      netProfit: opp.netProfit,
      tradeSize: opp.tradeSize,
    });
    return null;
  }

  const orderOptions = {
    tickSize: opp.market.tickSize as "0.1" | "0.01" | "0.001" | "0.0001",
    negRisk: false,
  };

  const yesOrder = {
    tokenID: opp.market.yesTokenId,
    side: Side.BUY,
    amount: opp.tradeSize,
    price: opp.bestAskYes,
  };

  const noOrder = {
    tokenID: opp.market.noTokenId,
    side: Side.BUY,
    amount: opp.tradeSize,
    price: opp.bestAskNo,
  };

  let yesResp: Awaited<ReturnType<typeof client.createAndPostMarketOrder>>;
  let noResp: Awaited<ReturnType<typeof client.createAndPostMarketOrder>>;

  try {
    [yesResp, noResp] = await Promise.all([
      client.createAndPostMarketOrder(yesOrder, orderOptions),
      client.createAndPostMarketOrder(noOrder, orderOptions),
    ]);
  } catch (err) {
    logger.error("Order placement failed", err);
    return null;
  }

  const yesOk = yesResp?.success === true;
  const noOk = noResp?.success === true;

  // If only one leg filled, attempt to cancel it to avoid directional risk
  if (yesOk && !noOk) {
    logger.warn("NO leg failed — cancelling YES order", { orderId: yesResp.orderID });
    try {
      await client.cancelOrder({ orderID: yesResp.orderID });
    } catch (cancelErr) {
      logger.error("CRITICAL: YES leg filled but cancel failed — manual action required", cancelErr);
    }
    return null;
  }

  if (!yesOk && noOk) {
    logger.warn("YES leg failed — cancelling NO order", { orderId: noResp.orderID });
    try {
      await client.cancelOrder({ orderID: noResp.orderID });
    } catch (cancelErr) {
      logger.error("CRITICAL: NO leg filled but cancel failed — manual action required", cancelErr);
    }
    return null;
  }

  if (!yesOk || !noOk) {
    logger.warn("Both legs failed", { yesError: yesResp, noError: noResp });
    return null;
  }

  const sharesPerLeg = opp.tradeSize / opp.bestAskYes;

  const position: Position = {
    id: randomBytes(8).toString("hex"),
    market: opp.market,
    opportunity: opp,
    yesOrderId: yesResp.orderID,
    noOrderId: noResp.orderID,
    yesFilledPrice: opp.bestAskYes,
    noFilledPrice: opp.bestAskNo,
    sizeShares: sharesPerLeg,
    entryTimestamp: new Date(),
    status: "open",
  };

  logger.info("Both legs filled", {
    id: position.id,
    question: opp.market.question,
    yesOrderId: position.yesOrderId,
    noOrderId: position.noOrderId,
    expectedNetProfit: opp.netProfit * sharesPerLeg,
  });

  return position;
}
