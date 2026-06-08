import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/auth/api-guard";

import { createOpportunityFromClaude } from "@/lib/opportunity/create-and-persist";



export async function POST(request: Request) {

  const authError = requireApiKey(request);

  if (authError) {

    return authError;

  }



  try {

    const result = await createOpportunityFromClaude();



    if (!result.success) {

      return NextResponse.json(

        {

          success: false,

          message: result.message,

          raw: result.raw,

        },

        { status: 422 }

      );

    }



    return NextResponse.json(

      {

        success: true,

        opportunity: result.opportunity,

      },

      { status: 201 }

    );

  } catch (error: unknown) {

    console.error(error);



    const err = error as {

      status?: number;

      message?: string;

      error?: unknown;

    };



    return NextResponse.json(

      {

        success: false,

        status: err.status,

        message: err.message ?? "Failed to generate opportunity",

        error: err.error,

      },

      { status: 500 }

    );

  }

}

