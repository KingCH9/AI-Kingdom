"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";

import {

  runValidatorCycleAction,

  validateOpportunityAction,

} from "@/app/actions/empire-mutations";



interface ValidatorDecisionButtonsProps {

  opportunityId: number;

}



export function ValidatorDecisionButtons({

  opportunityId,

}: ValidatorDecisionButtonsProps) {

  const router = useRouter();

  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  const [error, setError] = useState<string | null>(null);



  async function decide(decision: "approve" | "reject") {

    setLoading(decision);

    setError(null);



    try {

      const result = await validateOpportunityAction({

        opportunityId,

        decision,

      });



      if (!result.success) {

        setError(result.message ?? "Validation failed");

        return;

      }



      router.refresh();

    } catch {

      setError("Failed to connect to the server");

    } finally {

      setLoading(null);

    }

  }



  return (

    <div>

      <div className="flex flex-wrap gap-3">

        <button

          type="button"

          disabled={loading !== null}

          onClick={() => decide("approve")}

          className="px-4 py-2 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50"

        >

          {loading === "approve" ? "Validating..." : "Approve → Validated"}

        </button>

        <button

          type="button"

          disabled={loading !== null}

          onClick={() => decide("reject")}

          className="px-4 py-2 rounded-lg font-semibold text-sm bg-red-700 hover:bg-red-800 disabled:opacity-50"

        >

          {loading === "reject" ? "Rejecting..." : "Reject → Killed"}

        </button>

      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

    </div>

  );

}



export function RunValidatorCycleButton() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);



  async function run() {

    setLoading(true);

    setMessage(null);



    try {

      const result = await runValidatorCycleAction(20);



      if (!result.success) {

        setMessage("Validator cycle failed");

        return;

      }



      setMessage(

        `Processed ${result.processed} — ${result.approved} approved, ${result.rejected} rejected` +

          (result.failed ? `, ${result.failed} failed` : "")

      );

      router.refresh();

    } catch {

      setMessage("Failed to connect to the server");

    } finally {

      setLoading(false);

    }

  }



  return (

    <div>

      <button

        type="button"

        onClick={run}

        disabled={loading}

        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold disabled:opacity-50"

      >

        {loading ? "Running Atlas..." : "▶ Run Validator Cycle"}

      </button>

      {message && <p className="text-indigo-300 text-sm mt-2">{message}</p>}

    </div>

  );

}


