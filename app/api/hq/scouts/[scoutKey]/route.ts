import { NextResponse } from "next/server";
import { getScoutProfile } from "@/lib/hq/workstations";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ scoutKey: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { scoutKey } = await context.params;
    const { profile, rankings } = await getScoutProfile(scoutKey);

    if (!profile) {
      return NextResponse.json(
        { success: false, message: `Scout not found: ${scoutKey}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
      rankings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[hq/scouts/scoutKey] failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load scout profile",
      },
      { status: 500 }
    );
  }
}
