import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/auth/api-guard";

import { runTaskWorkerCycle } from "@/lib/agents/execution/runner";



export async function POST(request: Request) {

  const authError = requireApiKey(request);

  if (authError) {

    return authError;

  }



  try {

    const body = await request.json().catch(() => ({}));

    const limit = typeof body.limit === "number" ? body.limit : 10;



    const cycle = await runTaskWorkerCycle({ limit });



    return NextResponse.json({

      success: true,

      executed: cycle.executed,

      succeeded: cycle.succeeded,

      failed: cycle.failed,

      deferred: cycle.deferred,

      results: cycle.results,

    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(

      { success: false, error: String(error) },

      { status: 500 }

    );

  }

}

