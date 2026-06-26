import "dotenv/config";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const config = {
  privateKey: requireEnv("PRIVATE_KEY"),
  apiKey: process.env.CLOB_API_KEY ?? "",
  apiSecret: process.env.CLOB_API_SECRET ?? "",
  apiPassphrase: process.env.CLOB_API_PASSPHRASE ?? "",
  funderAddress: process.env.FUNDER_ADDRESS ?? "",

  clobHost: process.env.CLOB_HOST ?? "https://clob.polymarket.com",
  chainId: 137 as const,

  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 5000),
  tradeSize: Number(process.env.TRADE_SIZE_USDC ?? 10),
  minProfitThreshold: Number(process.env.MIN_PROFIT_THRESHOLD ?? 0.02),
  maxOpenPositions: Number(process.env.MAX_OPEN_POSITIONS ?? 5),
  dryRun: process.env.DRY_RUN !== "false",
  signatureType: 0 as const,

  // refresh market list every N poll cycles
  marketRefreshCycles: 60,
  // max markets per order book batch call
  bookBatchSize: 100,
  // conservative fee estimate (2%) — covers both legs
  estimatedFeeFraction: 0.02,
};
