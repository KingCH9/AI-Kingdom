import { NextResponse } from "next/server";

import { requireApiKey } from "@/lib/auth/api-guard";

import { executeTask } from "@/lib/agents/execution";



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

    const result = await executeTask(Number(id));



    if (!result.success) {

      const status = result.deferred ? 409 : 400;

      return NextResponse.json(

        {

          success: false,

          deferred: result.deferred ?? false,

          message: result.error,

          task: result.task,

        },

        { status }

      );

    }



    return NextResponse.json({

      success: true,

      task: result.task,

      result: result.result,

    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(

      { success: false, error: String(error) },

      { status: 500 }

    );

  }

}

