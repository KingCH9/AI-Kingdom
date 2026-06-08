import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/env";

const globalForAnthropic = global as unknown as {
  anthropic: Anthropic | undefined;
};

/**
 * Returns a singleton Anthropic client.
 * Mirrors the Prisma singleton pattern in lib/prisma.ts.
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({ apiKey });
  }

  return globalForAnthropic.anthropic;
}
