import { prisma } from "@/lib/prisma";
import { AGENT_NAMES, AGENT_ROLES } from "@/lib/types";

/** Core launch agents required for post-launch_ready task execution. */
const CORE_LAUNCH_AGENTS = [
  { name: AGENT_NAMES.STORE_BUILDER, role: AGENT_ROLES.STORE_BUILDER },
  { name: AGENT_NAMES.MARKETING_MANAGER, role: AGENT_ROLES.MARKETING_MANAGER },
  { name: AGENT_NAMES.OPERATIONS_MANAGER, role: AGENT_ROLES.OPERATIONS_MANAGER },
] as const;

export type AgentBootstrapReport = {
  created: string[];
  existing: string[];
};

/**
 * Idempotent startup bootstrap for launch pipeline agents.
 * Safe to run on every production startup — creates missing roles only.
 */
export async function ensureCoreLaunchAgents(): Promise<AgentBootstrapReport> {
  const created: string[] = [];
  const existing: string[] = [];

  for (const agent of CORE_LAUNCH_AGENTS) {
    const found = await prisma.agent.findFirst({
      where: { role: agent.role },
    });

    if (found) {
      existing.push(`${found.name} (${agent.role})`);
      continue;
    }

    await prisma.agent.create({
      data: {
        name: agent.name,
        role: agent.role,
        level: 1,
        xp: 0,
        status: "active",
      },
    });

    created.push(`${agent.name} (${agent.role})`);
  }

  if (created.length > 0) {
    console.log(
      `[agent-bootstrap] created ${created.length} agent(s): ${created.join(", ")}`
    );
  }

  if (existing.length > 0) {
    console.log(
      `[agent-bootstrap] verified ${existing.length} existing agent(s): ${existing.join(", ")}`
    );
  }

  return { created, existing };
}
