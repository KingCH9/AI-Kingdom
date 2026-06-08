import { NextResponse } from "next/server";

import { requireApiKeyOrCronSecret } from "@/lib/auth/api-guard";

import { runEmpireWorkerCycle } from "@/lib/agents/execution/empire-worker-cycle";

import { getTaskWorkerCronSecret } from "@/lib/env";



export async function POST(request: Request) {

  const authError = requireApiKeyOrCronSecret(request, getTaskWorkerCronSecret());

  if (authError) {

    return authError;

  }



  try {

    const body = await request.json().catch(() => ({}));

    const limit = typeof body.limit === "number" ? body.limit : undefined;



    const cycle = await runEmpireWorkerCycle({ taskLimit: limit });



    return NextResponse.json({

      success: true,

      validator: cycle.validator,

      tasks: {

        executed: cycle.tasks.executed,

        succeeded: cycle.tasks.succeeded,

        failed: cycle.tasks.failed,

        deferred: cycle.tasks.deferred,

      },

      intelligence: cycle.intelligence,

      startedAt: cycle.startedAt.toISOString(),

      finishedAt: cycle.finishedAt.toISOString(),

    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(

      { success: false, error: String(error) },

      { status: 500 }

    );

  }

}

