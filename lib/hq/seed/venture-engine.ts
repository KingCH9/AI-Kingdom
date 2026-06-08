import { prisma } from "@/lib/prisma";
import {
  VENTURE_TEMPLATE_KEYS,
  VENTURE_TYPE_KEYS,
} from "../constants";

const LOG_PREFIX = "[hq-venture-seed]";

const VENTURE_TYPE_SEEDS: Array<{
  key: string;
  name: string;
  description: string;
  active?: boolean;
}> = [
  {
    key: VENTURE_TYPE_KEYS.SHOPIFY,
    name: "Shopify",
    description: "Ecommerce stores on Shopify — physical and digital products.",
  },
  {
    key: VENTURE_TYPE_KEYS.ETSY,
    name: "Etsy",
    description: "Etsy shops — printables, crafts, and digital downloads.",
  },
  {
    key: VENTURE_TYPE_KEYS.AFFILIATE,
    name: "Affiliate",
    description: "Affiliate niche sites and comparison content properties.",
  },
  {
    key: VENTURE_TYPE_KEYS.CONTENT,
    name: "Content",
    description: "Content-led ventures — blogs, newsletters, and media.",
  },
  {
    key: VENTURE_TYPE_KEYS.SAAS,
    name: "SaaS",
    description: "Software-as-a-service and micro-SaaS products.",
  },
  {
    key: VENTURE_TYPE_KEYS.AMAZON,
    name: "Amazon",
    description: "Amazon FBA and marketplace product ventures.",
  },
  {
    key: VENTURE_TYPE_KEYS.AGENCY,
    name: "Agency",
    description: "Future — service agency ventures.",
    active: false,
  },
  {
    key: VENTURE_TYPE_KEYS.LICENSING,
    name: "Licensing",
    description: "Future — IP licensing ventures.",
    active: false,
  },
  {
    key: VENTURE_TYPE_KEYS.ACQUISITIONS,
    name: "Acquisitions",
    description: "Future — acquired business ventures.",
    active: false,
  },
];

const TEMPLATE_SEEDS: Array<{
  key: string;
  name: string;
  ventureTypeKey: string;
  description: string;
}> = [
  {
    key: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE,
    name: "Launch Shopify Store",
    ventureTypeKey: VENTURE_TYPE_KEYS.SHOPIFY,
    description: "Standard Shopify ecommerce store launch playbook.",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.ETSY_PRINTABLE,
    name: "Launch Etsy Printable Business",
    ventureTypeKey: VENTURE_TYPE_KEYS.ETSY,
    description: "Etsy printable and digital download business template.",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.AFFILIATE_SITE,
    name: "Launch Affiliate Website",
    ventureTypeKey: VENTURE_TYPE_KEYS.AFFILIATE,
    description: "Affiliate niche site with content and monetization phases.",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.CONTENT_SITE,
    name: "Launch Content Venture",
    ventureTypeKey: VENTURE_TYPE_KEYS.CONTENT,
    description: "Content-first media property launch template.",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.SAAS_MVP,
    name: "Launch SaaS MVP",
    ventureTypeKey: VENTURE_TYPE_KEYS.SAAS,
    description: "Micro-SaaS MVP build, beta, and launch template.",
  },
  {
    key: VENTURE_TEMPLATE_KEYS.AMAZON_FBA,
    name: "Launch Amazon FBA Venture",
    ventureTypeKey: VENTURE_TYPE_KEYS.AMAZON,
    description: "Amazon FBA product research and launch template.",
  },
];

export async function seedVentureEngine(): Promise<{
  typesCreated: number;
  templatesCreated: number;
}> {
  let typesCreated = 0;
  let templatesCreated = 0;

  const typeIdByKey = new Map<string, number>();

  for (const type of VENTURE_TYPE_SEEDS) {
    const existing = await prisma.ventureType.findUnique({
      where: { key: type.key },
    });

    if (!existing) {
      const created = await prisma.ventureType.create({
        data: {
          key: type.key,
          name: type.name,
          description: type.description,
          active: type.active ?? true,
        },
      });
      typeIdByKey.set(type.key, created.id);
      typesCreated += 1;
    } else {
      typeIdByKey.set(type.key, existing.id);
    }
  }

  for (const template of TEMPLATE_SEEDS) {
    const existing = await prisma.ventureTemplate.findUnique({
      where: { key: template.key },
    });
    if (existing) continue;

    const ventureTypeId = typeIdByKey.get(template.ventureTypeKey);
    if (!ventureTypeId) continue;

    await prisma.ventureTemplate.create({
      data: {
        key: template.key,
        name: template.name,
        ventureTypeId,
        description: template.description,
        active: true,
      },
    });
    templatesCreated += 1;
  }

  if (typesCreated > 0 || templatesCreated > 0) {
    console.log(
      `${LOG_PREFIX} seeded types=${typesCreated} templates=${templatesCreated}`
    );
  }

  return { typesCreated, templatesCreated };
}

/** Map legacy revenueStream values to venture type keys. */
export function revenueStreamToVentureTypeKey(
  revenueStream: string
): string {
  const map: Record<string, string> = {
    shopify: VENTURE_TYPE_KEYS.SHOPIFY,
    etsy: VENTURE_TYPE_KEYS.ETSY,
    affiliate: VENTURE_TYPE_KEYS.AFFILIATE,
    content: VENTURE_TYPE_KEYS.CONTENT,
    digital: VENTURE_TYPE_KEYS.ETSY,
    saas: VENTURE_TYPE_KEYS.SAAS,
    amazon: VENTURE_TYPE_KEYS.AMAZON,
  };
  return map[revenueStream.toLowerCase()] ?? VENTURE_TYPE_KEYS.SHOPIFY;
}

export async function backfillMissionVentureTypes(): Promise<number> {
  const shopifyType = await prisma.ventureType.findUnique({
    where: { key: VENTURE_TYPE_KEYS.SHOPIFY },
  });
  const shopifyTemplate = await prisma.ventureTemplate.findUnique({
    where: { key: VENTURE_TEMPLATE_KEYS.SHOPIFY_STORE },
  });

  if (!shopifyType) return 0;

  const types = await prisma.ventureType.findMany();
  const typeByKey = new Map(types.map((t) => [t.key, t.id]));

  const missions = await prisma.mission.findMany({
    where: { ventureTypeId: null },
  });

  let updated = 0;
  for (const mission of missions) {
    const typeKey = revenueStreamToVentureTypeKey(mission.revenueStream);
    const ventureTypeId = typeByKey.get(typeKey) ?? shopifyType.id;
    const ventureTemplateId =
      typeKey === VENTURE_TYPE_KEYS.SHOPIFY && shopifyTemplate
        ? shopifyTemplate.id
        : null;

    await prisma.mission.update({
      where: { id: mission.id },
      data: { ventureTypeId, ventureTemplateId },
    });
    updated += 1;
  }

  return updated;
}
