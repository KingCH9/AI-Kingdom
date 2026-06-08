import { prisma } from "@/lib/prisma";
import type { AgentRole } from "@/lib/types";

/** Finds the first active agent matching a canonical role. */
export async function findAgentByRole(role: AgentRole) {
  return prisma.agent.findFirst({
    where: { role },
  });
}
