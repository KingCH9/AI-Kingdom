import { NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/ops/diagnostics";

export async function GET() {
  const report = await runHealthChecks();

  return NextResponse.json(report, {
    status: report.status === "unhealthy" ? 503 : 200,
  });
}
