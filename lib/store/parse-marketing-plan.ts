export interface MarketingPlanView {
  marketingSummary: string;
  launchRecommendation: string;
  campaignNotes: string[];
}

/** Parses Gamma marketing plan JSON from a completed task result. */
export function parseMarketingPlanFromTaskResult(
  result: string | null | undefined
): MarketingPlanView | null {
  if (!result?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(result) as Partial<MarketingPlanView>;

    if (
      typeof parsed.marketingSummary !== "string" ||
      typeof parsed.launchRecommendation !== "string"
    ) {
      return null;
    }

    return {
      marketingSummary: parsed.marketingSummary,
      launchRecommendation: parsed.launchRecommendation,
      campaignNotes: Array.isArray(parsed.campaignNotes)
        ? parsed.campaignNotes.filter((note): note is string => typeof note === "string")
        : [],
    };
  } catch {
    return null;
  }
}
