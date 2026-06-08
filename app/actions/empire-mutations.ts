"use server";

import { recordAgentActivity } from "@/lib/agents/activity";
import { executeTask } from "@/lib/agents/execution";
import { runTaskWorkerCycle } from "@/lib/agents/execution/runner";
import {
  assertAuthorizedMutation,
  establishMutationSession,
  UnauthorizedMutationError,
} from "@/lib/auth/server-action-guard";
import { findAgentByRole } from "@/lib/agents/queries";
import {
  createOpportunityFromClaude,
  updateOpportunityStatus,
  validateOpportunity,
  type ValidationDecision,
} from "@/lib/opportunity";
import type { StatusTransitionActor } from "@/lib/opportunity/transitions";
import { runValidatorCycle } from "@/lib/opportunity/validator-cycle";
import { recordStoreRevenue } from "@/lib/store/record-revenue";
import { recordOrderRevenue } from "@/lib/commerce/record-order-revenue";
import {
  createStripeCheckoutSession,
  StripeCheckoutError,
} from "@/lib/commerce/create-stripe-checkout";
import type { OpportunityStatus } from "@/lib/types";
import { AGENT_ROLES } from "@/lib/types";

type MutationFailure = { success: false; message: string };

async function runAuthorizedMutation<T>(
  action: () => Promise<T>,
  scope: string
): Promise<T | MutationFailure> {
  try {
    await assertAuthorizedMutation();
    console.log(`[empire-mutation:${scope}] authorized — running`);
    const result = await action();
    console.log(`[empire-mutation:${scope}] completed`);
    return result;
  } catch (error) {
    if (error instanceof UnauthorizedMutationError) {
      console.warn(`[empire-mutation:${scope}] unauthorized`);
      return { success: false, message: error.message };
    }

    const message =
      error instanceof Error ? error.message : "Mutation failed unexpectedly";
    console.error(`[empire-mutation:${scope}] error:`, message, error);
    return { success: false, message };
  }
}

export async function authenticateEmpireSessionAction(token: string) {
  const ok = await establishMutationSession(token);

  if (!ok) {
    return {
      success: false as const,
      message: "Invalid credentials — use EMPIRE_API_KEY or EMPIRE_ADMIN_PASSWORD",
    };
  }

  return { success: true as const };
}

export async function generateOpportunityAction() {
  return runAuthorizedMutation(async () => {
    console.log("[generateOpportunityAction] start");
    const result = await createOpportunityFromClaude();

    if (!result.success) {
      console.warn(
        `[generateOpportunityAction] failed: ${result.message}`
      );
      return { success: false as const, message: result.message };
    }

    console.log(
      `[generateOpportunityAction] success id=${result.opportunity.id}`
    );
    return {
      success: true as const,
      opportunityId: result.opportunity.id,
    };
  }, "generateOpportunity");
}

export async function runTrendHunterAction() {
  return runAuthorizedMutation(async () => {
    const agent = await findAgentByRole(AGENT_ROLES.TREND_HUNTER);

    if (!agent) {
      return { success: false as const, message: "Trend Hunter not found" };
    }

    const result = await createOpportunityFromClaude();

    if (!result.success) {
      return { success: false as const, message: result.message };
    }

    await recordAgentActivity({
      agent,
      action: `Generated opportunity: ${result.opportunity.productName}`,
      opportunityId: result.opportunity.id,
    });

    return {
      success: true as const,
      opportunityId: result.opportunity.id,
    };
  }, "runTrendHunter");
}

export async function updateOpportunityStatusAction(input: {
  opportunityId: number;
  newStatus: OpportunityStatus;
  actor?: StatusTransitionActor;
}) {
  return runAuthorizedMutation(async () => {
    const result = await updateOpportunityStatus({
      opportunityId: input.opportunityId,
      newStatus: input.newStatus,
      actor: input.actor ?? "operator",
    });

    if (!result.success) {
      return { success: false as const, message: result.message };
    }

    return { success: true as const };
  }, "updateOpportunityStatus");
}

export async function validateOpportunityAction(input: {
  opportunityId: number;
  decision: ValidationDecision;
}) {
  return runAuthorizedMutation(async () => {
    const result = await validateOpportunity({
      opportunityId: input.opportunityId,
      decision: input.decision,
    });

    if (!result.success) {
      return { success: false as const, message: result.message };
    }

    return { success: true as const };
  }, "validateOpportunity");
}

export async function executeTaskAction(taskId: number) {
  return runAuthorizedMutation(async () => {
    const result = await executeTask(taskId);

    if (!result.success) {
      return {
        success: false as const,
        deferred: result.deferred ?? false,
        message: result.error ?? "Execution failed",
      };
    }

    return { success: true as const };
  }, "executeTask");
}

export async function executePendingTasksAction(limit = 20) {
  return runAuthorizedMutation(async () => {
    const cycle = await runTaskWorkerCycle({ limit });

    return {
      success: true as const,
      executed: cycle.executed,
      succeeded: cycle.succeeded,
      failed: cycle.failed,
      deferred: cycle.deferred,
    };
  }, "executePendingTasks");
}

export async function runValidatorCycleAction(limit = 20) {
  return runAuthorizedMutation(async () => {
    const cycle = await runValidatorCycle({ limit });

    return {
      success: true as const,
      processed: cycle.processed,
      approved: cycle.approved,
      rejected: cycle.rejected,
      failed: cycle.failed,
    };
  }, "runValidatorCycle");
}

export async function recordStoreRevenueAction(input: {
  storeId: number;
  amount: number;
  source?: string;
}) {
  return runAuthorizedMutation(async () => {
    try {
      const result = await recordStoreRevenue({
        storeId: input.storeId,
        amount: input.amount,
        source: input.source?.trim() || "manual_sale",
      });

      return { success: true as const, ...result };
    } catch (error) {
      return {
        success: false as const,
        message:
          error instanceof Error ? error.message : "Failed to record revenue",
      };
    }
  }, "recordStoreRevenue");
}

export async function recordOrderAction(input: {
  storeId: number;
  email: string;
  name?: string;
  total: number;
  source?: string;
}) {
  return runAuthorizedMutation(async () => {
    try {
      const result = await recordOrderRevenue({
        storeId: input.storeId,
        email: input.email,
        name: input.name,
        total: input.total,
        source: input.source?.trim() || "manual",
      });

      return { success: true as const, ...result };
    } catch (error) {
      return {
        success: false as const,
        message:
          error instanceof Error ? error.message : "Failed to record order",
      };
    }
  }, "recordOrder");
}

export async function createStripeCheckoutAction(input: {
  storeId: number;
  email?: string;
}) {
  return runAuthorizedMutation(async () => {
    try {
      const session = await createStripeCheckoutSession({
        storeId: input.storeId,
        customerEmail: input.email,
      });

      return {
        success: true as const,
        url: session.url,
        sessionId: session.sessionId,
      };
    } catch (error) {
      return {
        success: false as const,
        message:
          error instanceof StripeCheckoutError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Failed to create Stripe checkout",
      };
    }
  }, "createStripeCheckout");
}
