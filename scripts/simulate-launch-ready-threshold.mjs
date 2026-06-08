/**
 * Simulates launch_ready transitions before/after threshold change.
 * Usage: node scripts/simulate-launch-ready-threshold.mjs [api-url]
 */
const OLD_MIN = 80;
const NEW_MIN = 79;
const MAX_RISK = 4;
const MAX_COMP = 40;
const MIN_MARGIN = 65;

function parseProfitMargin(value) {
  if (!value) return 50;
  const normalized = String(value).replace("%", "").trim();
  const firstSegment = normalized.split("-")[0]?.trim() ?? normalized;
  const parsed = Number(firstSegment);
  return Number.isNaN(parsed) ? 50 : parsed;
}

function meetsLaunchReady(opp, minScore) {
  const margin = parseProfitMargin(opp.profitMargin);
  const score = opp.opportunityScore ?? 0;
  return (
    score >= minScore &&
    (opp.riskRating ?? 10) <= MAX_RISK &&
    (opp.competition ?? 100) <= MAX_COMP &&
    margin >= MIN_MARGIN
  );
}

function ceoDecision(opp, minScore) {
  if (meetsLaunchReady(opp, minScore)) return "approve";
  if ((opp.opportunityScore ?? 0) >= 70) return "hold";
  return "reject";
}

async function main() {
  const url =
    process.argv[2] ??
    "https://ai-kingdom-production.up.railway.app/api/opportunities";

  const opportunities = await (await fetch(url)).json();
  const sorted = [...opportunities].sort((a, b) => a.id - b.id);

  const validated = sorted.filter((o) => o.status === "validated");
  const transitions = [];

  for (const opp of sorted) {
    const before = ceoDecision(opp, OLD_MIN);
    const after = ceoDecision(opp, NEW_MIN);
    const wouldTransition =
      opp.status === "validated" &&
      before !== "approve" &&
      after === "approve";

    if (wouldTransition || opp.status === "validated") {
      transitions.push({
        id: opp.id,
        productName: opp.productName,
        status: opp.status,
        opportunityScore: opp.opportunityScore,
        beforeDecision: before,
        afterDecision: after,
        wouldMoveToLaunchReady: wouldTransition,
      });
    }
  }

  const moveCount = transitions.filter((t) => t.wouldMoveToLaunchReady).length;

  console.log(
    JSON.stringify(
      {
        thresholdChange: { from: OLD_MIN, to: NEW_MIN },
        totalOpportunities: sorted.length,
        currentValidated: validated.length,
        validatedToLaunchReady: moveCount,
        transitions,
        summary: {
          before: {
            launchReadyEligible: sorted.filter((o) =>
              meetsLaunchReady(o, OLD_MIN)
            ).length,
            validatedHeld: sorted.filter(
              (o) => o.status === "validated" && ceoDecision(o, OLD_MIN) === "hold"
            ).length,
          },
          after: {
            launchReadyEligible: sorted.filter((o) =>
              meetsLaunchReady(o, NEW_MIN)
            ).length,
            validatedWouldAutoApprove: moveCount,
          },
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
