import { NextResponse } from "next/server";
import { requireApiKeyOrCronSecret } from "@/lib/auth/api-guard";
import { getEmpireApiKey } from "@/lib/env";
import { runEmpirePipelineCycle } from "@/lib/opportunity/pipeline-cycle";

export async function POST(request: Request) {
  const authError = requireApiKeyOrCronSecret(request, getEmpireApiKey());
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : undefined;

    const cycle = await runEmpirePipelineCycle({ limit });

    return NextResponse.json({
      success: true,
      validator: {
        processed: cycle.validator.processed,
        approved: cycle.validator.approved,
        rejected: cycle.validator.rejected,
        failed: cycle.validator.failed,
      },
      ceo: {
        processed: cycle.ceo.processed,
        approved: cycle.ceo.approved,
        rejected: cycle.ceo.rejected,
        failed: cycle.ceo.failed,
      },
      startedAt: cycle.startedAt.toISOString(),
      finishedAt: cycle.finishedAt.toISOString(),
    });
  } catch (error) {
    console.error("[pipeline] manual run-cycle error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
