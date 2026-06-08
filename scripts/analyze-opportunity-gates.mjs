/**
 * Detailed gate analysis for a single opportunity record (JSON on stdin or file).
 */
const THRESHOLDS = {
  LAUNCH_READY_MIN_SCORE: 79,
  LAUNCH_READY_MAX_RISK: 4,
  LAUNCH_READY_MAX_COMPETITION: 40,
  LAUNCH_READY_MIN_PROFIT_MARGIN: 65,
  VALIDATED_MIN_SCORE: 70,
};

const WEIGHTS = { DEMAND: 0.35, LOW_COMPETITION: 0.3, PROFIT_MARGIN: 0.2, LOW_RISK: 1.5 };

function parseProfitMargin(value) {
  if (!value) return 50;
  const normalized = String(value).replace("%", "").trim();
  const firstSegment = normalized.split("-")[0]?.trim() ?? normalized;
  const parsed = Number(firstSegment);
  return Number.isNaN(parsed) ? 50 : parsed;
}

function computeScore(input) {
  const raw =
    input.demandScore * WEIGHTS.DEMAND +
    (100 - input.competition) * WEIGHTS.LOW_COMPETITION +
    input.profitMargin * WEIGHTS.PROFIT_MARGIN +
    (10 - input.riskRating) * WEIGHTS.LOW_RISK;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}

async function main() {
  const url = process.argv[2] ?? "https://ai-kingdom-production.up.railway.app/api/opportunities";
  const id = Number(process.argv[3] ?? 8);

  const res = await fetch(url);
  const all = await res.json();
  const opp = all.find((o) => o.id === id);
  if (!opp) {
    console.error(`Opportunity #${id} not found`);
    process.exit(1);
  }

  const profitMargin = parseProfitMargin(opp.profitMargin);
  const input = {
    demandScore: opp.demandScore ?? 0,
    competition: opp.competition ?? 0,
    riskRating: opp.riskRating ?? 10,
    profitMargin,
  };
  const computed = computeScore(input);

  const gates = {
    opportunityScore: {
      label: "Composite opportunityScore",
      required: `>= ${THRESHOLDS.LAUNCH_READY_MIN_SCORE}`,
      stored: opp.opportunityScore,
      computed,
      actual: computed,
      pass: computed >= THRESHOLDS.LAUNCH_READY_MIN_SCORE,
      formula: `${input.demandScore}×0.35 + ${100 - input.competition}×0.30 + ${input.profitMargin}×0.20 + ${10 - input.riskRating}×1.5 = ${computed}`,
    },
    riskRating: {
      label: "riskRating (riskScore)",
      required: `<= ${THRESHOLDS.LAUNCH_READY_MAX_RISK}`,
      actual: opp.riskRating,
      pass: (opp.riskRating ?? 10) <= THRESHOLDS.LAUNCH_READY_MAX_RISK,
    },
    competition: {
      label: "competition (competitionScore)",
      required: `<= ${THRESHOLDS.LAUNCH_READY_MAX_COMPETITION}`,
      actual: opp.competition,
      pass: (opp.competition ?? 100) <= THRESHOLDS.LAUNCH_READY_MAX_COMPETITION,
    },
    profitMargin: {
      label: "estimatedMargin (parsed profitMargin)",
      required: `>= ${THRESHOLDS.LAUNCH_READY_MIN_PROFIT_MARGIN}%`,
      raw: opp.profitMargin,
      parsed: profitMargin,
      actual: profitMargin,
      pass: profitMargin >= THRESHOLDS.LAUNCH_READY_MIN_PROFIT_MARGIN,
    },
  };

  const launchReady = Object.values(gates).every((g) => g.pass);
  const validated = computed >= THRESHOLDS.VALIDATED_MIN_SCORE;
  let ceoDecision = "hold";
  if (launchReady) ceoDecision = "approve";
  else if (!validated) ceoDecision = "reject";

  console.log(
    JSON.stringify(
      {
        id: opp.id,
        productName: opp.productName,
        status: opp.status,
        category: opp.category,
        metrics: {
          opportunityScore: opp.opportunityScore,
          demandScore: opp.demandScore,
          riskRating: opp.riskRating,
          competition: opp.competition,
          profitMarginRaw: opp.profitMargin,
          profitMarginParsed: profitMargin,
        },
        ceoDecision,
        launchReady,
        validated,
        gates,
        failedGates: Object.entries(gates)
          .filter(([, g]) => !g.pass)
          .map(([k, g]) => ({ gate: k, ...g })),
      },
      null,
      2
    )
  );
}

main();
