import { NextResponse } from "next/server";

import { requireApiKeyOrCronSecret } from "@/lib/auth/api-guard";

import { runValidatorCycle } from "@/lib/opportunity/validator-cycle";

import { getValidatorCronSecret } from "@/lib/env";



export async function POST(request: Request) {

  const authError = requireApiKeyOrCronSecret(request, getValidatorCronSecret());

  if (authError) {

    return authError;

  }



  try {

    const body = await request.json().catch(() => ({}));

    const limit = typeof body.limit === "number" ? body.limit : undefined;



    const cycle = await runValidatorCycle({ limit });



    return NextResponse.json({

      success: true,

      processed: cycle.processed,

      approved: cycle.approved,

      rejected: cycle.rejected,

      failed: cycle.failed,

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

