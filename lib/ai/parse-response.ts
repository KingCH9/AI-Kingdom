import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";

/**
 * Extracts concatenated text from Claude message content blocks.
 */
export function extractTextFromMessage(message: Message): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Strips markdown code fences and parses JSON from a Claude text response.
 */
export function parseJsonFromClaudeText<T>(text: string): T {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned) as T;
}
