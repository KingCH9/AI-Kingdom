import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeEmpirePerformance } from "./analyze-performance";
import { loadEmpireDataset } from "./load-empire-data";
import type { EmpirePerformanceAnalysis, IntelligenceSnapshot } from "./types";
import { reconcileAllStoreOpportunityLifecycle } from "@/lib/lifecycle";

const SNAPSHOT_PATH = path.join(process.cwd(), "data", "intelligence-snapshot.json");

let memorySnapshot: IntelligenceSnapshot | null = null;

async function ensureDataDir() {
  await mkdir(path.dirname(snapshotPath()), { recursive: true });
}

function snapshotPath(): string {
  return SNAPSHOT_PATH;
}

async function readSnapshotFromDisk(): Promise<IntelligenceSnapshot | null> {
  try {
    const raw = await readFile(snapshotPath(), "utf8");
    return JSON.parse(raw) as IntelligenceSnapshot;
  } catch {
    return null;
  }
}

async function writeSnapshotToDisk(snapshot: IntelligenceSnapshot) {
  await ensureDataDir();
  await writeFile(snapshotPath(), JSON.stringify(snapshot, null, 2), "utf8");
}

/** Read-only intelligence compute — no DB reconciliation or disk writes. */
async function computeIntelligenceSnapshotReadOnly(): Promise<IntelligenceSnapshot> {
  const dataset = await loadEmpireDataset();
  const analysis = analyzeEmpirePerformance(dataset);

  return {
    analysis,
    generatedAt: new Date().toISOString(),
    opportunityCount: dataset.opportunities.length,
    storeCount: dataset.stores.length,
  };
}

/**
 * Returns cached or read-only intelligence for dashboards.
 * Never reconciles lifecycle or writes to disk/database.
 */
export async function getIntelligenceSnapshot(
  options: { refresh?: boolean } = {}
): Promise<IntelligenceSnapshot> {
  if (!options.refresh && memorySnapshot) {
    return memorySnapshot;
  }

  if (!options.refresh) {
    const disk = await readSnapshotFromDisk();
    if (disk) {
      memorySnapshot = disk;
      return disk;
    }
  }

  const snapshot = await computeIntelligenceSnapshotReadOnly();
  memorySnapshot = snapshot;
  return snapshot;
}

/**
 * Worker/maintenance path — reconciles lifecycle, recomputes, persists snapshot.
 * Do not call from page loads or read-only query paths.
 */
export async function refreshIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
  await reconcileAllStoreOpportunityLifecycle();

  const snapshot = await computeIntelligenceSnapshotReadOnly();

  memorySnapshot = snapshot;
  await writeSnapshotToDisk(snapshot);

  return snapshot;
}

export type { EmpirePerformanceAnalysis, IntelligenceSnapshot };
