import type { ClaudeOpportunityResponse } from "@/lib/types";

const CATEGORY_KEYWORDS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: "Pets",
    patterns: [/pet/i, /dog/i, /cat/i, /animal/i],
  },
  {
    category: "Fitness",
    patterns: [/fitness/i, /gym/i, /workout/i, /exercise/i, /sport/i],
  },
  {
    category: "Beauty",
    patterns: [/beauty/i, /skin/i, /cosmetic/i, /makeup/i, /hair/i],
  },
  {
    category: "Home",
    patterns: [/home/i, /kitchen/i, /bedroom/i, /decor/i, /furniture/i],
  },
  {
    category: "Tech",
    patterns: [/tech/i, /gadget/i, /electronic/i, /phone/i, /usb/i],
  },
  {
    category: "Fashion",
    patterns: [/fashion/i, /clothing/i, /apparel/i, /wear/i, /jewelry/i],
  },
  {
    category: "Health",
    patterns: [/health/i, /wellness/i, /supplement/i, /vitamin/i],
  },
  {
    category: "Baby",
    patterns: [/baby/i, /infant/i, /toddler/i, /nursery/i],
  },
  {
    category: "Outdoor",
    patterns: [/outdoor/i, /camping/i, /hiking/i, /travel/i],
  },
];

/** Normalizes a category label for storage and intelligence grouping. */
export function normalizeCategoryLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return "General";
  }

  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 64);
}

function inferCategoryFromText(
  productName?: string,
  productDescription?: string
): string | null {
  const haystack = `${productName ?? ""} ${productDescription ?? ""}`.trim();

  if (!haystack) {
    return null;
  }

  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((pattern) => pattern.test(haystack))) {
      return category;
    }
  }

  return null;
}

/**
 * Derives a meaningful category from Claude output.
 * Uses explicit category when present, otherwise keyword inference.
 */
export function deriveOpportunityCategory(
  data: ClaudeOpportunityResponse
): string {
  if (data.category?.trim()) {
    return normalizeCategoryLabel(data.category);
  }

  const inferred = inferCategoryFromText(
    data.productName,
    data.productDescription
  );

  if (inferred) {
    return inferred;
  }

  return "General";
}
