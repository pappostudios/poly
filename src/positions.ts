import fs from "fs";
import path from "path";
import { Position, BotStats } from "./types";
import { logger } from "./logger";

const DATA_DIR = path.join(process.cwd(), "data");
const POSITIONS_FILE = path.join(DATA_DIR, "positions.json");

export class PositionTracker {
  private positions = new Map<string, Position>();
  private stats: BotStats = {
    scansCompleted: 0,
    opportunitiesFound: 0,
    ordersPlaced: 0,
    totalPnl: 0,
    openPositions: 0,
  };

  loadFromDisk(): void {
    try {
      if (!fs.existsSync(POSITIONS_FILE)) return;
      const raw = JSON.parse(fs.readFileSync(POSITIONS_FILE, "utf8")) as Position[];
      for (const p of raw) {
        // restore Date objects
        p.entryTimestamp = new Date(p.entryTimestamp);
        p.opportunity.detectedAt = new Date(p.opportunity.detectedAt);
        this.positions.set(p.id, p);
      }
      logger.info("Positions loaded from disk", { count: this.positions.size });
    } catch (err) {
      logger.warn("Could not load positions file", { error: String(err) });
    }
  }

  persistToDisk(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(POSITIONS_FILE, JSON.stringify([...this.positions.values()], null, 2));
    } catch (err) {
      logger.warn("Could not persist positions", { error: String(err) });
    }
  }

  addPosition(pos: Position): void {
    this.positions.set(pos.id, pos);
    this.stats.ordersPlaced++;
    this.stats.openPositions = this.getOpenPositions().length;
    this.persistToDisk();
    logger.info("Position opened", { id: pos.id, market: pos.market.question });
  }

  closePosition(positionId: string, resolvedOutcome: "YES" | "NO"): void {
    const pos = this.positions.get(positionId);
    if (!pos) return;

    // One leg pays 1.0 per share, the other 0. We bought both.
    const winPrice = resolvedOutcome === "YES" ? pos.yesFilledPrice : pos.noFilledPrice;
    const loseCost = resolvedOutcome === "YES" ? pos.noFilledPrice : pos.yesFilledPrice;
    const pnlPerShare = 1.0 - winPrice - loseCost;
    pos.realizedPnl = pnlPerShare * pos.sizeShares;
    pos.status = "closed";

    this.stats.totalPnl += pos.realizedPnl;
    this.stats.openPositions = this.getOpenPositions().length;
    this.positions.set(positionId, pos);
    this.persistToDisk();
    logger.info("Position closed", { id: positionId, pnl: pos.realizedPnl });
  }

  getOpenPositions(): Position[] {
    return [...this.positions.values()].filter((p) => p.status === "open");
  }

  incrementScans(opportunitiesFound: number): void {
    this.stats.scansCompleted++;
    this.stats.opportunitiesFound += opportunitiesFound;
    this.stats.openPositions = this.getOpenPositions().length;
  }

  getStats(): BotStats {
    return { ...this.stats };
  }
}
