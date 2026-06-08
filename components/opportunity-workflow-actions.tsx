"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";

import {

  generateOpportunityAction,

  updateOpportunityStatusAction,

} from "@/app/actions/empire-mutations";

import type { OpportunityStatus } from "@/lib/types";

import { getAllowedTransitions } from "@/lib/opportunity/transitions";



interface OpportunityWorkflowActionsProps {

  opportunityId: number;

  currentStatus: string;

  actor?: "ceo" | "validator" | "operator";

}



const STATUS_BUTTON_STYLES: Partial<Record<OpportunityStatus, string>> = {

  launch_ready: "bg-green-600 hover:bg-green-700",

  validated: "bg-blue-600 hover:bg-blue-700",

  killed: "bg-red-700 hover:bg-red-800",

  sourcing: "bg-purple-600 hover:bg-purple-700",

  building: "bg-indigo-600 hover:bg-indigo-700",

  launched: "bg-teal-600 hover:bg-teal-700",

  profitable: "bg-emerald-600 hover:bg-emerald-700",

};



function formatStatus(status: string): string {

  return status.replace(/_/g, " ");

}



export function OpportunityWorkflowActions({

  opportunityId,

  currentStatus,

  actor = "operator",

}: OpportunityWorkflowActionsProps) {

  const router = useRouter();

  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);



  const allowed = getAllowedTransitions(currentStatus, actor);



  async function transitionTo(newStatus: OpportunityStatus) {

    setLoadingStatus(newStatus);

    setError(null);



    try {

      const result = await updateOpportunityStatusAction({

        opportunityId,

        newStatus,

        actor,

      });



      if (!result.success) {

        setError(result.message ?? "Status update failed");

        return;

      }



      router.refresh();

    } catch {

      setError("Failed to connect to the server");

    } finally {

      setLoadingStatus(null);

    }

  }



  if (allowed.length === 0) {

    return (

      <p className="text-gray-500 text-sm">

        No workflow actions available for this status.

      </p>

    );

  }



  return (

    <div>

      <div className="flex flex-wrap gap-3">

        {allowed.map((status) => (

          <button

            key={status}

            type="button"

            disabled={loadingStatus !== null}

            onClick={() => transitionTo(status)}

            className={`px-4 py-2 rounded-lg font-semibold text-sm capitalize disabled:opacity-50 ${

              STATUS_BUTTON_STYLES[status] ??

              "bg-gray-700 hover:bg-gray-600"

            }`}

          >

            {loadingStatus === status

              ? "Updating..."

              : actor === "ceo" && status === "launch_ready"

                ? "Approve → Launch Ready"

                : actor === "ceo" && status === "killed"

                  ? "Reject → Killed"

                  : actor === "validator" && status === "validated"

                    ? "Approve → Validated"

                    : actor === "validator" && status === "killed"

                      ? "Reject → Killed"

                      : `Move to ${formatStatus(status)}`}

          </button>

        ))}

      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

    </div>

  );

}



interface GenerateOpportunityButtonProps {

  label?: string;

  className?: string;

}



export function GenerateOpportunityButton({

  label = "Generate Opportunity",

  className = "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50",

}: GenerateOpportunityButtonProps) {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  async function generate() {

    setLoading(true);

    setError(null);



    try {

      const result = await generateOpportunityAction();



      if (!result.success) {

        setError(result.message ?? "Generation failed");

        return;

      }



      router.push(`/opportunities/${result.opportunityId}`);

      router.refresh();

    } catch (error) {

      console.error("[GenerateOpportunityButton] server action failed:", error);

      const message =

        error instanceof Error

          ? error.message

          : "Server action failed — check Railway logs for [generate-opportunity]";

      setError(message);

    } finally {

      setLoading(false);

    }

  }



  return (

    <div>

      <button

        type="button"

        onClick={generate}

        disabled={loading}

        className={className}

      >

        {loading ? "Generating..." : label}

      </button>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

    </div>

  );

}



interface CeoDecisionButtonsProps {

  opportunityId: number;

}



export function CeoDecisionButtons({ opportunityId }: CeoDecisionButtonsProps) {

  return (

    <OpportunityWorkflowActions

      opportunityId={opportunityId}

      currentStatus="validated"

      actor="ceo"

    />

  );

}


