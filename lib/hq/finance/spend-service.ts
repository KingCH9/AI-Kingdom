import { prisma } from "@/lib/prisma";
import { currentBudgetPeriodMonth } from "../constants";
import {
  createMissionEventWithCost,
  MISSION_EVENT_ACTIONS,
} from "../events/mission-events";

export type RecordSpendInput = {
  departmentId: number;
  amount: number;
  reason: string;
  missionId?: number | null;
  agentPersona?: string | null;
};

export async function recordDepartmentSpend(input: RecordSpendInput) {
  const amount = input.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false as const, message: "amount must be a positive number" };
  }

  const reason = input.reason.trim();
  if (!reason) {
    return { success: false as const, message: "reason is required" };
  }

  const department = await prisma.department.findUnique({
    where: { id: input.departmentId },
  });
  if (!department) {
    return { success: false as const, message: "Department not found" };
  }

  if (input.missionId) {
    const mission = await prisma.mission.findFirst({
      where: { id: input.missionId, departmentId: input.departmentId },
    });
    if (!mission) {
      return {
        success: false as const,
        message: "Mission not found in this department",
      };
    }
  }

  const periodMonth = currentBudgetPeriodMonth();

  const budget = await prisma.budget.upsert({
    where: {
      departmentId_periodMonth: {
        departmentId: input.departmentId,
        periodMonth,
      },
    },
    create: {
      departmentId: input.departmentId,
      periodMonth,
      allocatedGbp: department.monthlyBudgetGbp,
      spentGbp: amount,
    },
    update: {
      spentGbp: { increment: amount },
    },
  });

  let event = null;
  if (input.missionId) {
    event = await createMissionEventWithCost({
      missionId: input.missionId,
      action: MISSION_EVENT_ACTIONS.SPEND_RECORDED,
      detail: reason,
      agentPersona: input.agentPersona ?? "mercury",
      estimatedCostGbp: amount,
    });
  }

  return {
    success: true as const,
    budget: {
      departmentId: budget.departmentId,
      periodMonth: budget.periodMonth,
      allocatedGbp: budget.allocatedGbp,
      spentGbp: budget.spentGbp,
      remainingGbp: Math.max(budget.allocatedGbp - budget.spentGbp, 0),
    },
    event,
  };
}
