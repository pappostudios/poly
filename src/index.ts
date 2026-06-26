import { getClobClient } from "./client";
import { getActiveBinaryMarkets } from "./markets";
import { scanForArbitrage } from "./scanner";
import { executeArbitrage } from "./executor";
import { PositionTracker } from "./positions";
import { config } from "./config";
import { logger } from "./logger";

async function main() {
  logger.info("Polymarket arbitrage bot starting", {
    dryRun: config.dryRun,
    pollIntervalMs: config.pollIntervalMs,
    tradeSize: config.tradeSize,
    minProfitThreshold: config.minProfitThreshold,
  });

  const client = getClobClient();

  // Verify connectivity
  try {
    await client.getOk();
    logger.info("CLOB API reachable");
  } catch (err) {
    logger.error("CLOB API unreachable — check CLOB_HOST and network", err);
    process.exit(1);
  }

  const tracker = new PositionTracker();
  tracker.loadFromDisk();

  let markets = await getActiveBinaryMarkets(client);
  let scanCount = 0;

  const poll = async () => {
    try {
      // Refresh market list every N cycles
      if (scanCount > 0 && scanCount % config.marketRefreshCycles === 0) {
        markets = await getActiveBinaryMarkets(client);
      }

      const opportunities = await scanForArbitrage(client, markets);
      tracker.incrementScans(opportunities.length);

      for (const opp of opportunities) {
        logger.arbitrage(opp);

        if (tracker.getOpenPositions().length < config.maxOpenPositions) {
          const position = await executeArbitrage(client, opp);
          if (position) tracker.addPosition(position);
        } else {
          logger.warn("Max open positions reached — skipping opportunity");
        }
      }

      if (scanCount % 12 === 0) {
        // log stats every ~minute
        logger.stats(tracker.getStats());
      }

      scanCount++;
    } catch (err) {
      logger.error("Poll cycle error", err);
    }

    setTimeout(poll, config.pollIntervalMs);
  };

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    logger.info("Shutting down", tracker.getStats());
    process.exit(0);
  });

  await poll();
}

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});
