import { NextRequest, NextResponse } from "next/server";

import { requireApiKey } from "@/lib/auth/api-guard";

import type { OpportunityStatus } from "@/lib/types";

import { updateOpportunityStatus } from "@/lib/opportunity";

import type { StatusTransitionActor } from "@/lib/opportunity/transitions";



export async function POST(

  request: NextRequest,

  context: { params: Promise<{ id: string }> }

) {

  const authError = requireApiKey(request);

  if (authError) {

    return authError;

  }



  try {

    const { id } = await context.params;

    const body = await request.json();



    const newStatus = body.status as OpportunityStatus;

    const actor = (body.actor as StatusTransitionActor | undefined) ?? "operator";



    if (!newStatus) {

      return NextResponse.json(

        { success: false, message: "status is required" },

        { status: 400 }

      );

    }



    const result = await updateOpportunityStatus({

      opportunityId: Number(id),

      newStatus,

      actor,

    });



    if (!result.success) {

      return NextResponse.json(

        { success: false, message: result.message },

        { status: 400 }

      );

    }



    return NextResponse.json({

      success: true,

      opportunity: result.opportunity,

    });

  } catch (error) {

    console.error(error);



    return NextResponse.json(

      { success: false, error: String(error) },

      { status: 500 }

    );

  }

}

