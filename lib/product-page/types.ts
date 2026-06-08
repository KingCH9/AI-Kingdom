export type ProductPageFaqItem = {
  question: string;
  answer: string;
};

/** Generated sales page content from the Product Page Agent. */
export type ProductPageContent = {
  heroHeadline: string;
  subheadline: string;
  salesCopy: string;
  benefits: string[];
  features: string[];
  faq: ProductPageFaqItem[];
  ctaText: string;
  seoTitle: string;
  seoDescription: string;
};

export type MarketingPlanInput = {
  marketingSummary: string;
  launchRecommendation: string;
  campaignNotes: string[];
};
