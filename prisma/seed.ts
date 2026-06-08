import { PrismaClient } from "@prisma/client";
import { AGENT_NAMES, AGENT_ROLES } from "../lib/types/agent";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AI Empire...");

  // Clear existing data
  await prisma.task.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.product.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.store.deleteMany();
  await prisma.agent.deleteMany();

  // Core agent team — roles must match AGENT_ROLES constants
  await prisma.agent.createMany({
    data: [
      {
        name: AGENT_NAMES.CEO,
        role: AGENT_ROLES.CEO,
        level: 1,
        xp: 0,
        status: "active",
      },
      {
        name: AGENT_NAMES.TREND_HUNTER,
        role: AGENT_ROLES.TREND_HUNTER,
        level: 1,
        xp: 0,
        status: "active",
      },
      {
        name: AGENT_NAMES.STORE_BUILDER,
        role: AGENT_ROLES.STORE_BUILDER,
        level: 1,
        xp: 0,
        status: "active",
      },
      {
        name: AGENT_NAMES.VALIDATOR,
        role: AGENT_ROLES.VALIDATOR,
        level: 1,
        xp: 0,
        status: "active",
      },
      {
        name: AGENT_NAMES.MARKETING_MANAGER,
        role: AGENT_ROLES.MARKETING_MANAGER,
        level: 1,
        xp: 0,
        status: "active",
      },
    ],
  });

  // Stores
  await prisma.store.createMany({
    data: [
      {
        name: "Smart Living Store",
        niche: "Home",
        revenue: 0,
        status: "active",
      },
      {
        name: "FitLife Store",
        niche: "Fitness",
        revenue: 0,
        status: "active",
      },
    ],
  });

  // Opportunities
  await prisma.opportunity.createMany({
    data: [
      {
        productName: "Smart Water Bottle",
        category: "Fitness",
        demandScore: 95,
        competition: 20,
        supplier: "AliExpress",
        status: "approved",
      },
      {
        productName: "LED Galaxy Projector",
        category: "Home",
        demandScore: 84,
        competition: 22,
        supplier: "Zendrop",
        status: "approved",
      },
    ],
  });

  // Tasks
  await prisma.task.createMany({
    data: [
      {
        title: "Research trending products",
        agent: AGENT_NAMES.TREND_HUNTER,
        status: "pending",
        result: "",
      },
      {
        title: "Approve product opportunities",
        agent: AGENT_NAMES.CEO,
        status: "pending",
        result: "",
      },
      {
        title: "Create marketing campaign",
        agent: AGENT_NAMES.MARKETING_MANAGER,
        status: "pending",
        result: "",
      },
    ],
  });

  console.log("✅ AI Empire Seeded Successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
