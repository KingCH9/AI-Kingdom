import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = global as unknown as {
  anthropic: Anthropic | undefined;
};

/**
 * Returns a singleton Anthropic client.
 * Mirrors the Prisma singleton pattern in lib/prisma.ts.
 */
export function getAnthropicClient(): Anthropic {
  if (!globalForAnthropic.anthropic) {
    globalForAnthropic.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }

  return globalForAnthropic.anthropic;
}
