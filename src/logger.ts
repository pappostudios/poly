import { ArbitrageOpportunity, BotStats } from "./types";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function emit(level: LogLevel, msg: string, data?: object) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...data });
  if (level === "ERROR" || level === "WARN") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  debug: (msg: string, data?: object) => emit("DEBUG", msg, data),
  info: (msg: string, data?: object) => emit("INFO", msg, data),
  warn: (msg: string, data?: object) => emit("WARN", msg, data),
  error: (msg: string, err?: unknown) => {
    const errData = err instanceof Error ? { error: err.message, stack: err.stack } : { error: String(err) };
    emit("ERROR", msg, errData);
  },
  arbitrage: (opp: ArbitrageOpportunity) =>
    emit("INFO", "ARBITRAGE_OPPORTUNITY", {
      question: opp.market.question,
      bestAskYes: opp.bestAskYes,
      bestAskNo: opp.bestAskNo,
      grossCost: opp.grossCost,
      netProfit: opp.netProfit,
      tradeSize: opp.tradeSize,
    }),
  stats: (stats: BotStats) => emit("INFO", "BOT_STATS", stats),
};
