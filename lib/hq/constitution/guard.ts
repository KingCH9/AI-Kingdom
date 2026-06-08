import type { Mission } from "@prisma/client";
import {
  createMissionEvent,
  MISSION_EVENT_ACTIONS,
} from "../events/mission-events";
import { MISSION_STATUSES } from "../constants";

type ConstitutionCheckInput = {
  mission: Pick<
    Mission,
    "id" | "status" | "approvedAt" | "approvedBy" | "targetRoi"
  >;
  previousStatus?: string;
  agentPersona?: string | null;
};

/** Soft-mode constitution guard — logs warnings only, never blocks. */
export async function runConstitutionGuard(
  input: ConstitutionCheckInput
): Promise<void> {
  const { mission, previousStatus, agentPersona } = input;

  if (
    mission.status === MISSION_STATUSES.BUILDING &&
    previousStatus !== MISSION_STATUSES.BUILDING &&
    !mission.approvedAt &&
    !mission.approvedBy
  ) {
    await createMissionEvent({
      missionId: mission.id,
      action: MISSION_EVENT_ACTIONS.RULE_VIOLATION,
      detail: "Build phase started without Atlas approval",
      agentPersona: agentPersona ?? "system",
    });
  }

  if (
    mission.status === MISSION_STATUSES.LAUNCHING &&
    previousStatus !== MISSION_STATUSES.LAUNCHING &&
    (mission.targetRoi == null || mission.targetRoi <= 0)
  ) {
    await createMissionEvent({
      missionId: mission.id,
      action: MISSION_EVENT_ACTIONS.RULE_VIOLATION,
      detail: "Launch phase started without measurable ROI",
      agentPersona: agentPersona ?? "system",
    });
  }
}
