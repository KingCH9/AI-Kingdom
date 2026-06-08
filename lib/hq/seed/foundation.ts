import { prisma } from "@/lib/prisma";
import {
  currentBudgetPeriodMonth,
  DEFAULT_DEPARTMENT_BUDGETS_GBP,
  DEPARTMENT_KEYS,
} from "../constants";

const LOG_PREFIX = "[hq-seed]";

const DEPARTMENT_SEEDS = [
  {
    key: DEPARTMENT_KEYS.CEO_OFFICE,
    name: "CEO Office",
    description: "Strategic approval, budget allocation, and venture prioritization.",
  },
  {
    key: DEPARTMENT_KEYS.RESEARCH_LAB,
    name: "Research Lab",
    description: "Opportunity discovery, market research, and validation.",
  },
  {
    key: DEPARTMENT_KEYS.BUILDER_WORKSHOP,
    name: "Builder Workshop",
    description: "Store builds, listings, landing pages, and asset publishing.",
  },
  {
    key: DEPARTMENT_KEYS.GROWTH,
    name: "Growth Department",
    description: "SEO, content, campaigns, and conversion optimization.",
  },
  {
    key: DEPARTMENT_KEYS.FINANCE,
    name: "Finance Department",
    description: "Profit monitoring, ROI tracking, and AI cost oversight.",
  },
] as const;

const CONSTITUTION_SEEDS = [
  {
    key: "profit_over_activity",
    title: "Profit > Activity",
    description: "Prioritize profitable outcomes over busy work.",
    priority: 1,
  },
  {
    key: "revenue_over_vanity",
    title: "Revenue > Vanity Metrics",
    description: "Measure success by revenue and profit, not vanity metrics.",
    priority: 2,
  },
  {
    key: "atlas_approval_required",
    title: "Atlas Approval Required",
    description: "No venture launches without Atlas (CEO) approval.",
    priority: 3,
  },
  {
    key: "human_override",
    title: "Human Override",
    description: "A human operator can override any automated decision.",
    priority: 4,
  },
  {
    key: "measurable_roi",
    title: "Measurable ROI",
    description: "Every venture must have measurable ROI targets.",
    priority: 5,
  },
  {
    key: "log_all_actions",
    title: "Log All AI Actions",
    description: "Every AI action must be logged for audit and learning.",
    priority: 6,
  },
  {
    key: "cost_estimate_required",
    title: "Cost Estimate Required",
    description: "Every AI action must include a cost estimate.",
    priority: 7,
  },
] as const;

export async function seedHqFoundation(): Promise<{
  departmentsCreated: number;
  budgetsCreated: number;
  rulesCreated: number;
}> {
  let departmentsCreated = 0;
  let budgetsCreated = 0;
  let rulesCreated = 0;

  const periodMonth = currentBudgetPeriodMonth();

  for (const dept of DEPARTMENT_SEEDS) {
    const existing = await prisma.department.findUnique({
      where: { key: dept.key },
    });

    if (!existing) {
      await prisma.department.create({
        data: {
          key: dept.key,
          name: dept.name,
          description: dept.description,
          monthlyBudgetGbp: DEFAULT_DEPARTMENT_BUDGETS_GBP[dept.key],
        },
      });
      departmentsCreated += 1;
    }

    const department = await prisma.department.findUniqueOrThrow({
      where: { key: dept.key },
    });

    await prisma.budget.upsert({
      where: {
        departmentId_periodMonth: {
          departmentId: department.id,
          periodMonth,
        },
      },
      create: {
        departmentId: department.id,
        periodMonth,
        allocatedGbp: DEFAULT_DEPARTMENT_BUDGETS_GBP[dept.key],
        spentGbp: 0,
      },
      update: {},
    });
    budgetsCreated += 1;
  }

  for (const rule of CONSTITUTION_SEEDS) {
    const existing = await prisma.constitutionRule.findUnique({
      where: { key: rule.key },
    });
    if (!existing) {
      await prisma.constitutionRule.create({ data: rule });
      rulesCreated += 1;
    }
  }

  if (departmentsCreated > 0 || rulesCreated > 0) {
    console.log(
      `${LOG_PREFIX} foundation seeded departments=${departmentsCreated} budgets=${budgetsCreated} rules=${rulesCreated}`
    );
  }

  return { departmentsCreated, budgetsCreated, rulesCreated };
}
