import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/auth/api-guard";

import {

  validateOpportunity,

  type ValidationDecision,

} from "@/lib/opportunity/validate-opportunity";



export async function POST(

  request: Request,

  context: { params: Promise<{ id: string }> }

) {

  const authError = requireApiKey(request);

  if (authError) {

    return authError;

  }



  try {

    const { id } = await context.params;

    const body = await request.json();

    const decision = body.decision as ValidationDecision;



    if (decision !== "approve" && decision !== "reject") {

      return NextResponse.json(

        { success: false, message: 'decision must be "approve" or "reject"' },

        { status: 400 }

      );

    }



    const result = await validateOpportunity({

      opportunityId: Number(id),

      decision,

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

      decision: result.decision,

    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(

      { success: false, error: String(error) },

      { status: 500 }

    );

  }

}

