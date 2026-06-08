/**
 * @deprecated Empire Score V1 API — archived Phase 4D.
 * Use GET /api/hq/empire (V2 scoring).
 */
import { NextResponse } from "next/server";
import { getEmpireScoreSnapshot } from "@/lib/hq/empire/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getEmpireScoreSnapshot();
  return NextResponse.json({
    success: true,
    deprecated: true,
    message: "Empire V1 API archived — use GET /api/hq/empire",
    empireScore: snapshot.empireScore,
    generatedAt: snapshot.generatedAt,
  });
}
