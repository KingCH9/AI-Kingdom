"use client";



import { useRouter } from "next/navigation";

import { useState } from "react";

import {

  executePendingTasksAction,

  executeTaskAction,

} from "@/app/actions/empire-mutations";



interface ExecuteTaskButtonProps {

  taskId: number;

  label?: string;

}



export function ExecuteTaskButton({

  taskId,

  label = "Execute",

}: ExecuteTaskButtonProps) {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);



  async function run() {

    setLoading(true);

    setError(null);



    try {

      const result = await executeTaskAction(taskId);



      if (!result.success) {
        const deferred = "deferred" in result && result.deferred;

        setError(
          deferred
            ? `Deferred: ${result.message ?? "Waiting on dependencies"}`
            : (result.message ?? "Execution failed")
        );

        return;
      }



      router.refresh();

    } catch {

      setError("Failed to connect to the server");

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

        className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-semibold disabled:opacity-50"

      >

        {loading ? "Running..." : label}

      </button>

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}

    </div>

  );

}



export function ExecuteAllPendingButton() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);



  async function run() {

    setLoading(true);

    setMessage(null);



    try {

      const result = await executePendingTasksAction(20);



      if (!result.success) {

        setMessage("Execution failed");

        return;

      }



      setMessage(

        `Executed ${result.executed} — ${result.succeeded} succeeded, ${result.failed} failed` +

          (result.deferred ? `, ${result.deferred} deferred` : "")

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

        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50"

      >

        {loading ? "Executing..." : "▶ Execute All Pending"}

      </button>

      {message && (

        <p className="text-green-400 text-sm mt-2">{message}</p>

      )}

    </div>

  );

}


