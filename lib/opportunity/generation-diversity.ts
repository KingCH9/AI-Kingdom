/**
 * Target categories for explicit rotation (Option D Phase 1).
 * Health remains available but deprioritized when overrepresented.
 */
export const ROTATION_TARGET_CATEGORIES = [
  "Pets",
  "Home & Kitchen",
  "Automotive",
  "Gardening",
  "Baby",
  "Office",
  "DIY",
  "Sports",
  "Travel",
  "Outdoor",
  "Electronics Accessories",
  "Health",
] as const;

export type RotationTargetCategory = (typeof ROTATION_TARGET_CATEGORIES)[number];

export type RecentOpportunitySnapshot = {
  id: number;
  productName: string;
  category: string;
  /** Niche label — product name used as concept identifier when no niche field exists. */
  niche: string;
};

export type DiversityContext = {
  recent: RecentOpportunitySnapshot[];
  doNotRepeat: {
    productNames: string[];
    categories: string[];
    niches: string[];
  };
  blockedCategories: string[];
  preferredCategories: string[];
};

const CATEGORY_ALIASES: Record<string, RotationTargetCategory | string> = {
  home: "Home & Kitchen",
  kitchen: "Home & Kitchen",
  "home & kitchen": "Home & Kitchen",
  auto: "Automotive",
  automotive: "Automotive",
  car: "Automotive",
  garden: "Gardening",
  gardening: "Gardening",
  office: "Office",
  diy: "DIY",
  sport: "Sports",
  sports: "Sports",
  fitness: "Sports",
  travel: "Travel",
  outdoor: "Outdoor",
  tech: "Electronics Accessories",
  electronics: "Electronics Accessories",
  "electronics accessories": "Electronics Accessories",
  gadget: "Electronics Accessories",
  pet: "Pets",
  pets: "Pets",
  baby: "Baby",
  health: "Health",
  wellness: "Health",
  beauty: "Health",
};

/** Normalizes category labels for rotation comparisons. */
export function normalizeRotationCategory(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "General";
  }

  const key = value.trim().toLowerCase();
  const aliased = CATEGORY_ALIASES[key];
  if (aliased) {
    return aliased;
  }

  const title = value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  const titleKey = title.toLowerCase();
  return CATEGORY_ALIASES[titleKey] ?? title;
}

function extractNiche(productName: string, category: string): string {
  const name = productName.trim();
  if (!name) {
    return category || "Unknown";
  }
  return name.length > 80 ? `${name.slice(0, 77)}...` : name;
}

/** Builds diversity context from the most recent persisted opportunities. */
export function buildDiversityContext(
  rows: Array<{
    id: number;
    productName: string;
    category: string | null;
  }>
): DiversityContext {
  const recent: RecentOpportunitySnapshot[] = rows.map((row) => {
    const category = normalizeRotationCategory(row.category);
    return {
      id: row.id,
      productName: row.productName,
      category,
      niche: extractNiche(row.productName, category),
    };
  });

  const blockedCategories = [
    ...new Set(recent.slice(0, 3).map((row) => row.category)),
  ];

  const categoryCounts = new Map<string, number>();
  for (const cat of ROTATION_TARGET_CATEGORIES) {
    categoryCounts.set(cat, 0);
  }
  for (const row of recent) {
    const cat = normalizeRotationCategory(row.category);
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  const preferredCategories = [...ROTATION_TARGET_CATEGORIES]
    .filter((cat) => !blockedCategories.includes(cat))
    .sort((a, b) => (categoryCounts.get(a) ?? 0) - (categoryCounts.get(b) ?? 0));

  return {
    recent,
    doNotRepeat: {
      productNames: recent.map((row) => row.productName),
      categories: [...new Set(recent.map((row) => row.category))],
      niches: recent.map((row) => row.niche),
    },
    blockedCategories,
    preferredCategories,
  };
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );
}

/** Jaccard similarity between two strings (0 = distinct, 1 = identical). */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection += 1;
    }
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Diversity score 0–100 for a generated opportunity vs recent history.
 * Higher = more distinct category and product concept.
 */
export function computeDiversityScore(
  productName: string,
  category: string,
  context: DiversityContext
): number {
  let score = 100;
  const normalizedCategory = normalizeRotationCategory(category);

  if (context.blockedCategories.includes(normalizedCategory)) {
    score -= 35;
  }

  const categoryCount = context.recent.filter(
    (row) => row.category === normalizedCategory
  ).length;
  score -= Math.min(25, categoryCount * 8);

  let maxSimilarity = 0;
  for (const row of context.recent) {
    maxSimilarity = Math.max(
      maxSimilarity,
      nameSimilarity(productName, row.productName)
    );
  }
  score -= Math.round(maxSimilarity * 40);

  const preferredIndex = context.preferredCategories.indexOf(
    normalizedCategory as RotationTargetCategory
  );
  if (preferredIndex >= 0) {
    const boost = Math.max(0, 15 - preferredIndex * 2);
    score += Math.min(15, boost);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** True when product name is substantially similar to a recent opportunity. */
export function isDuplicateConcept(
  productName: string,
  context: DiversityContext,
  threshold = 0.45
): boolean {
  return context.recent.some(
    (row) => nameSimilarity(productName, row.productName) >= threshold
  );
}
