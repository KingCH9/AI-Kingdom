import { getIntelligenceSnapshot } from "@/lib/intelligence";
import type { IntelligenceSnapshot } from "@/lib/intelligence/types";

export type { IntelligenceSnapshot };

export async function getEmpireIntelligence(): Promise<IntelligenceSnapshot> {
  return getIntelligenceSnapshot();
}
