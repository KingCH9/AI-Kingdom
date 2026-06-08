import type { Opportunity } from "@prisma/client";
import { recordAgentActivity, logAgentAction } from "@/lib/agents/activity";
import { findAgentByRole } from "@/lib/agents/queries";
import { AGENT_NAMES, AGENT_ROLES } from "@/lib/types";
import type { OpportunityStatus } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { handleLaunchReadyEffects } from "./launch-ready-effects";
import { syncStoreFromOpportunityKill } from "@/lib/lifecycle";
import {
  isCeoTransition,
  isValidTransition,
  isValidatorTransition,
  type StatusTransitionActor,
} from "./transitions";
import { normalizeOpportunityStatus } from "./status";

export type UpdateOpportunityStatusInput = {
  opportunityId: number;
  newStatus: OpportunityStatus;
  actor?: StatusTransitionActor;
};

export type UpdateOpportunityStatusResult =
  | { success: true; opportunity: Opportunity }
  | { success: false; message: string };

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

async function resolveActingAgent(
  actor: StatusTransitionActor,
  fromStatus: string,
  toStatus: OpportunityStatus
) {
  if (actor === "ceo" || isCeoTransition(fromStatus, toStatus)) {
    return findAgentByRole(AGENT_ROLES.CEO);
  }

  if (actor === "validator" || isValidatorTransition(fromStatus, toStatus)) {
    return findAgentByRole(AGENT_ROLES.VALIDATOR);
  }

  return null;
}

function buildLogAction(
  agentName: string,
  opportunityId: number,
  productName: string,
  fromStatus: string,
  toStatus: OpportunityStatus
): string {
  if (isValidatorTransition(fromStatus, toStatus)) {
    if (toStatus === "validated") {
      return `${agentName} validated opportunity #${opportunityId} (${productName})`;
    }
    return `${agentName} rejected opportunity #${opportunityId} (${productName}) → killed`;
  }

  if (isCeoTransition(fromStatus, toStatus)) {
    if (toStatus === "launch_ready") {
      return `${agentName} approved opportunity #${opportunityId} (${productName}) → launch ready`;
    }
    return `${agentName} rejected opportunity #${opportunityId} (${productName}) → killed`;
  }

  return `${agentName} moved opportunity #${opportunityId} (${productName}): ${formatStatusLabel(fromStatus)} → ${formatStatusLabel(toStatus)}`;
}

/**
 * Single entry point for manual opportunity status changes.
 * Governance:
 * - researching → validated/killed requires actor "validator"
 * - validated → launch_ready requires actor "ceo"
 */
export async function updateOpportunityStatus(
  input: UpdateOpportunityStatusInput
): Promise<UpdateOpportunityStatusResult> {
  const { opportunityId, newStatus, actor = "operator" } = input;

  const existing = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!existing) {
    return { success: false, message: "Opportunity not found" };
  }

  const fromStatus = normalizeOpportunityStatus(existing.status);

  console.log(
    `[pipeline:transition] opportunity #${opportunityId} "${existing.productName}" ` +
      `${fromStatus} → ${newStatus} (actor=${actor})`
  );

  if (fromStatus === newStatus) {
    return { success: false, message: "Opportunity is already in that status" };
  }

  if (isValidatorTransition(fromStatus, newStatus) && actor !== "validator") {
    return {
      success: false,
      message: "Only Atlas (Validator) may validate or reject researching opportunities",
    };
  }

  if (newStatus === "validated" && actor !== "validator") {
    return {
      success: false,
      message: "Only Atlas (Validator) may validate opportunities",
    };
  }

  if (newStatus === "launch_ready" && actor !== "ceo") {
    return {
      success: false,
      message: "Only the CEO may approve opportunities for launch",
    };
  }

  if (actor === "validator") {
    if (!isValidatorTransition(fromStatus, newStatus)) {
      return {
        success: false,
        message:
          "Validator may only approve (validated) or reject (killed) researching opportunities",
      };
    }
  } else if (actor === "ceo") {
    if (!isCeoTransition(fromStatus, newStatus)) {
      return {
        success: false,
        message:
          "CEO may only approve (launch_ready) or reject (killed) validated opportunities",
      };
    }
  } else if (!isValidTransition(fromStatus, newStatus)) {
    return {
      success: false,
      message: `Transition from ${fromStatus} to ${newStatus} is not allowed`,
    };
  }

  const opportunity = await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { status: newStatus },
  });

  const actingAgent = await resolveActingAgent(actor, fromStatus, newStatus);
  const agentName =
    actingAgent?.name ??
    (actor === "ceo"
      ? AGENT_NAMES.CEO
      : actor === "validator"
        ? AGENT_NAMES.VALIDATOR
        : "Operator");

  const action = buildLogAction(
    agentName,
    opportunityId,
    existing.productName,
    fromStatus,
    newStatus
  );

  if (actingAgent) {
    await recordAgentActivity({
      agent: actingAgent,
      action,
      opportunityId,
    });
  } else {
    await logAgentAction(agentName, action, { opportunityId });
  }

  if (newStatus === "launch_ready") {
    await handleLaunchReadyEffects(opportunity);
  }

  if (newStatus === "killed") {
    await syncStoreFromOpportunityKill(opportunityId);
  }

  return { success: true, opportunity };
}
