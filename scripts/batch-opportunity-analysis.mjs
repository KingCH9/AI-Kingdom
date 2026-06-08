/**
 * Generates N opportunities via Claude (no DB persist) and evaluates launch_ready gates.
 * Usage: node scripts/batch-opportunity-analysis.mjs [count]
 */
import "dotenv/config";

const COUNT = Number(process.argv[2] ?? 20);

const THRESHOLDS = {
  VALIDATED_MIN_SCORE: 70,
  LAUNCH_READY_MIN_SCORE: 79,
  LAUNCH_READY_MAX_RISK: 4,
  LAUNCH_READY_MAX_COMPETITION: 40,
  LAUNCH_READY_MIN_PROFIT_MARGIN: 65,
};

const WEIGHTS = {
  DEMAND: 0.35,
  LOW_COMPETITION: 0.3,
  PROFIT_MARGIN: 0.2,
  LOW_RISK: 1.5,
};

function parseProfitMargin(value) {
  if (!value) return 50;
  const normalized = String(value).replace("%", "").trim();
  const firstSegment = normalized.split("-")[0]?.trim() ?? normalized;
  const parsed = Number(firstSegment);
  return Number.isNaN(parsed) ? 50 : parsed;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deriveRiskRating(riskRating, profitMargin) {
  const parsed = Number(riskRating);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10) {
    return Math.floor(parsed);
  }
  return clamp(10 - Math.floor(profitMargin / 12), 1, 10);
}

function deriveDemandScore(claudeScore, profitMargin, riskRating) {
  const parsed = Number(claudeScore);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
    return Math.floor(parsed);
  }
  const raw = profitMargin * 0.55 + (10 - riskRating) * 4.5;
  return clamp(Math.floor(raw), 0, 100);
}

function deriveCompetition(demandScore, profitMargin, riskRating) {
  const raw =
    100 - demandScore * 0.65 - profitMargin * 0.25 + riskRating * 1.5;
  return clamp(Math.floor(raw), 0, 100);
}

function deriveScores(data) {
  const profitMargin = parseProfitMargin(data.profitMargin);
  const riskRating = deriveRiskRating(data.riskRating, profitMargin);
  const demandScore = deriveDemandScore(
    data.opportunityScore,
    profitMargin,
    riskRating
  );
  const competition = deriveCompetition(demandScore, profitMargin, riskRating);
  return { demandScore, competition, riskRating, profitMargin };
}

function computeOpportunityScore(input) {
  const raw =
    input.demandScore * WEIGHTS.DEMAND +
    (100 - input.competition) * WEIGHTS.LOW_COMPETITION +
    input.profitMargin * WEIGHTS.PROFIT_MARGIN +
    (10 - input.riskRating) * WEIGHTS.LOW_RISK;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}

function evaluateGates(input) {
  const opportunityScore = computeOpportunityScore(input);
  const gates = {
    opportunityScore: {
      required: `>= ${THRESHOLDS.LAUNCH_READY_MIN_SCORE}`,
      actual: opportunityScore,
      pass: opportunityScore >= THRESHOLDS.LAUNCH_READY_MIN_SCORE,
    },
    riskRating: {
      required: `<= ${THRESHOLDS.LAUNCH_READY_MAX_RISK}`,
      actual: input.riskRating,
      pass: input.riskRating <= THRESHOLDS.LAUNCH_READY_MAX_RISK,
    },
    competition: {
      required: `<= ${THRESHOLDS.LAUNCH_READY_MAX_COMPETITION}`,
      actual: input.competition,
      pass: input.competition <= THRESHOLDS.LAUNCH_READY_MAX_COMPETITION,
    },
    profitMargin: {
      required: `>= ${THRESHOLDS.LAUNCH_READY_MIN_PROFIT_MARGIN}%`,
      actual: input.profitMargin,
      pass: input.profitMargin >= THRESHOLDS.LAUNCH_READY_MIN_PROFIT_MARGIN,
    },
  };
  const launchReady = Object.values(gates).every((g) => g.pass);
  const validated =
    opportunityScore >= THRESHOLDS.VALIDATED_MIN_SCORE;
  let ceoDecision = "hold";
  if (launchReady) ceoDecision = "approve";
  else if (!validated) ceoDecision = "reject";

  return { opportunityScore, gates, launchReady, validated, ceoDecision };
}

const PROMPT = `You are a world-class ecommerce strategist.

Your task is to identify the single best ecommerce opportunity right now.

Analyze:
- Current market trends
- Competition levels
- Profit margins
- Demand growth
- Ease of sourcing
- Advertising potential
- Long-term scalability

Choose one specific ecommerce category for the "category" field (examples: Pets, Fitness, Beauty, Home, Tech, Fashion, Health, Baby, Outdoor).

Return ONLY valid JSON in this exact format:

{
  "productName": "",
  "productDescription": "",
  "whyTrending": "",
  "targetCustomer": "",
  "sellingPrice": "",
  "estimatedCostPerUnit": "",
  "profitMargin": "",
  "marketingAngles": [],
  "tiktokIdeas": [],
  "facebookAdIdeas": [],
  "shopifyStoreNames": [],
  "supplierSearch": "",
  "alibabaKeywords": [],
  "launchPlan": [],
  "category": "",
  "riskRating": 0,
  "opportunityScore": 0
}

Do not include markdown.
Return raw JSON only.`;

async function generateOne(index) {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: process.env.OPPORTUNITY_GENERATION_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: PROMPT }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON in response");
  }
  const data = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  const scores = deriveScores(data);
  const eval_ = evaluateGates(scores);

  return {
    index,
    productName: data.productName,
    category: data.category,
    claudeOpportunityScore: data.opportunityScore,
    ...scores,
    ...eval_,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY required");
    process.exit(1);
  }

  const results = [];
  const errors = [];

  for (let i = 1; i <= COUNT; i++) {
    process.stderr.write(`Generating ${i}/${COUNT}...\n`);
    try {
      const row = await generateOne(i);
      results.push(row);
      process.stderr.write(
        `  #${i} ${row.productName?.slice(0, 40)} score=${row.opportunityScore} launch=${row.launchReady}\n`
      );
    } catch (err) {
      errors.push({ index: i, error: String(err) });
      process.stderr.write(`  #${i} FAILED: ${err.message ?? err}\n`);
    }
  }

  const scores = results.map((r) => r.opportunityScore);
  const launchReady = results.filter((r) => r.launchReady);
  const validated = results.filter((r) => r.validated);
  const avg = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  const gateFailures = {
    opportunityScore: 0,
    riskRating: 0,
    competition: 0,
    profitMargin: 0,
  };
  for (const r of results.filter((x) => !x.launchReady)) {
    for (const [key, gate] of Object.entries(r.gates)) {
      if (!gate.pass) gateFailures[key]++;
    }
  }

  const output = {
    generated: results.length,
    errors: errors.length,
    statistics: {
      averageScore: Math.round(avg * 10) / 10,
      highestScore: scores.length ? Math.max(...scores) : null,
      lowestScore: scores.length ? Math.min(...scores) : null,
      validatedCount: validated.length,
      launchReadyCount: launchReady.length,
      launchReadyPct:
        results.length > 0
          ? Math.round((launchReady.length / results.length) * 1000) / 10
          : 0,
    },
    gateFailureCounts: gateFailures,
    launchReadyCandidates: launchReady.map((r) => ({
      productName: r.productName,
      category: r.category,
      opportunityScore: r.opportunityScore,
      demandScore: r.demandScore,
      competition: r.competition,
      riskRating: r.riskRating,
      profitMargin: r.profitMargin,
    })),
    allResults: results.map((r) => ({
      productName: r.productName,
      category: r.category,
      opportunityScore: r.opportunityScore,
      demandScore: r.demandScore,
      competition: r.competition,
      riskRating: r.riskRating,
      profitMargin: r.profitMargin,
      launchReady: r.launchReady,
      validated: r.validated,
      ceoDecision: r.ceoDecision,
      failedGates: Object.entries(r.gates)
        .filter(([, g]) => !g.pass)
        .map(([k, g]) => ({ gate: k, required: g.required, actual: g.actual })),
    })),
    errors,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
