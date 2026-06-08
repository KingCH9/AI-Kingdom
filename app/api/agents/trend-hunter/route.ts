import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/auth/api-guard";

import { recordAgentActivity } from "@/lib/agents/activity";

import { findAgentByRole } from "@/lib/agents/queries";

import { AGENT_ROLES } from "@/lib/types";

import { createOpportunityFromClaude } from "@/lib/opportunity/create-and-persist";



export async function POST(request: Request) {

  const authError = requireApiKey(request);

  if (authError) {

    return authError;

  }



  try {

    const agent = await findAgentByRole(AGENT_ROLES.TREND_HUNTER);



    if (!agent) {

      return NextResponse.json({

        success: false,

        message: "Trend Hunter not found",

      });

    }



    const result = await createOpportunityFromClaude();



    if (!result.success) {

      return NextResponse.json({

        success: false,

        message: result.message,

        raw: result.raw,

      });

    }



    await recordAgentActivity({

      agent,

      action: `Generated opportunity: ${result.opportunity.productName}`,

      opportunityId: result.opportunity.id,

    });



    return NextResponse.json({

      success: true,

      result,

    });

  } catch (error) {

    console.error(error);



    return NextResponse.json({

      success: false,

      error: String(error),

    });

  }

}

