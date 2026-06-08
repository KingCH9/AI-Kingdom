import type { Opportunity } from "@prisma/client";
import { normalizeOpportunityStatus } from "@/lib/opportunity/status";
import { prisma } from "@/lib/prisma";

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
}

export interface EmpireFunnelStats {
  stages: FunnelStage[];
  total: number;
  activePipeline: number;
  conversionRates: {
    researchToValidated: number;
    validatedToLaunchReady: number;
    launchReadyToLaunched: number;
    launchedToProfitable: number;
  };
}

const FUNNEL_STAGE_ORDER = [
  { stage: "researching", label: "Researching" },
  { stage: "validated", label: "Validated" },
  { stage: "launch_ready", label: "Launch Ready" },
  { stage: "building", label: "Building" },
  { stage: "launched", label: "Launched" },
  { stage: "scaling", label: "Scaling" },
  { stage: "profitable", label: "Profitable" },
] as const;

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

/** Computes empire-wide opportunity funnel metrics. */
export function computeEmpireFunnel(
  opportunities: Opportunity[]
): EmpireFunnelStats {
  const counts = new Map<string, number>();

  for (const { stage } of FUNNEL_STAGE_ORDER) {
    counts.set(stage, 0);
  }

  let killed = 0;

  for (const opp of opportunities) {
    const status = normalizeOpportunityStatus(opp.status);

    if (status === "killed") {
      killed += 1;
      continue;
    }

    if (counts.has(status)) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }

  const stages: FunnelStage[] = FUNNEL_STAGE_ORDER.map(({ stage, label }) => ({
    stage,
    label,
    count: counts.get(stage) ?? 0,
  }));

  const researching = counts.get("researching") ?? 0;
  const validated = counts.get("validated") ?? 0;
  const launchReady = counts.get("launch_ready") ?? 0;
  const building = counts.get("building") ?? 0;
  const launched = counts.get("launched") ?? 0;
  const scaling = counts.get("scaling") ?? 0;
  const profitable = counts.get("profitable") ?? 0;

  const passedValidation =
    validated + launchReady + building + launched + scaling + profitable;
  const passedCeo = launchReady + building + launched + scaling + profitable;
  const passedBuild = building + launched + scaling + profitable;
  const passedLaunch = launched + scaling + profitable;

  return {
    stages,
    total: opportunities.length,
    activePipeline: opportunities.length - killed,
    conversionRates: {
      researchToValidated: pct(passedValidation, researching + passedValidation),
      validatedToLaunchReady: pct(passedCeo, validated + passedCeo),
      launchReadyToLaunched: pct(passedLaunch, passedBuild + passedLaunch),
      launchedToProfitable: pct(profitable, passedLaunch),
    },
  };
}

/** Loads opportunities and computes funnel — for dashboard use. */
export async function getEmpireFunnel(): Promise<EmpireFunnelStats> {
  const opportunities = await prisma.opportunity.findMany();
  return computeEmpireFunnel(opportunities);
}
