import { NextResponse } from "next/server";
import { getEmpireApiKey, isProduction } from "@/lib/env";

function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

function readCronSecretHeader(request: Request): string | null {
  return request.headers.get("x-cron-secret");
}

function matchesSecret(request: Request, secret: string): boolean {
  const bearer = readBearerToken(request);
  const header = request.headers.get("x-api-key");
  const cronHeader = readCronSecretHeader(request);

  return (
    header === secret ||
    bearer === secret ||
    cronHeader === secret
  );
}

/** Optional API key guard for mutation endpoints. Open in dev when EMPIRE_API_KEY is unset. */
export function requireApiKey(request: Request): NextResponse | null {
  const configured = getEmpireApiKey();

  if (!configured) {
    if (isProduction()) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized — EMPIRE_API_KEY is required in production",
        },
        { status: 401 }
      );
    }

    return null;
  }

  if (matchesSecret(request, configured)) {
    return null;
  }

  return NextResponse.json(
    { success: false, message: "Unauthorized — valid x-api-key required" },
    { status: 401 }
  );
}

/**
 * Cron routes accept a dedicated cron secret OR EMPIRE_API_KEY.
 * When a cron secret is configured, requests without valid credentials are rejected.
 */
export function requireApiKeyOrCronSecret(
  request: Request,
  cronSecret?: string
): NextResponse | null {
  const trimmedCron = cronSecret?.trim();
  const apiKey = getEmpireApiKey();

  if (trimmedCron && matchesSecret(request, trimmedCron)) {
    return null;
  }

  if (apiKey && matchesSecret(request, apiKey)) {
    return null;
  }

  if (trimmedCron) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Unauthorized — valid cron secret (x-cron-secret) or x-api-key required",
      },
      { status: 401 }
    );
  }

  return requireApiKey(request);
}
