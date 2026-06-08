import { cookies, headers } from "next/headers";
import {
  getEmpireAdminPassword,
  getEmpireApiKey,
  requiresMutationAuth,
} from "@/lib/env";

export const EMPIRE_MUTATION_COOKIE = "empire_mutation_auth";

export class UnauthorizedMutationError extends Error {
  constructor(
    message = "Unauthorized — valid mutation credentials required. Unlock mutations in the sidebar or provide x-api-key."
  ) {
    super(message);
    this.name = "UnauthorizedMutationError";
  }
}

function readBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  return authorization.slice(7);
}

function tokenMatchesConfiguredSecrets(token: string): boolean {
  const apiKey = getEmpireApiKey();
  const adminPassword = getEmpireAdminPassword();

  return (
    (apiKey !== undefined && token === apiKey) ||
    (adminPassword !== undefined && token === adminPassword)
  );
}

async function hasValidMutationCredentials(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(EMPIRE_MUTATION_COOKIE)?.value;

  if (session && tokenMatchesConfiguredSecrets(session)) {
    return true;
  }

  const headersList = await headers();
  const headerKey = headersList.get("x-api-key");
  const bearer = readBearerToken(headersList.get("authorization"));
  const candidate = headerKey ?? bearer;

  if (!candidate) {
    return false;
  }

  return tokenMatchesConfiguredSecrets(candidate);
}

/**
 * Guards server-side mutations invoked through Server Actions.
 * Open in development when no auth env is configured.
 */
export async function assertAuthorizedMutation(): Promise<void> {
  if (!requiresMutationAuth()) {
    return;
  }

  if (await hasValidMutationCredentials()) {
    return;
  }

  throw new UnauthorizedMutationError();
}

/** Sets an httpOnly session cookie after validating API key or admin password. */
export async function establishMutationSession(token: string): Promise<boolean> {
  if (!requiresMutationAuth()) {
    return true;
  }

  if (!tokenMatchesConfiguredSecrets(token)) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(EMPIRE_MUTATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return true;
}
