import { getAnthropicClient } from "./client";
import { DEFAULT_CLAUDE_MODEL, DEFAULT_MAX_TOKENS } from "./config";
import { extractTextFromMessage } from "./parse-response";

export interface AskClaudeOptions {
  model?: string;
  maxTokens?: number;
}

/**
 * General-purpose Claude text completion.
 * Preserves the original lib/ai.ts behaviour for future agent use.
 */
export async function askClaude(
  prompt: string,
  options: AskClaudeOptions = {}
): Promise<string> {
  const { model = DEFAULT_CLAUDE_MODEL, maxTokens = DEFAULT_MAX_TOKENS } =
    options;

  try {
    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return extractTextFromMessage(response);
  } catch (error: unknown) {
    console.error(error);

    const err = error as {
      status?: number;
      message?: string;
      error?: unknown;
    };

    return JSON.stringify({
      status: err.status,
      message: err.message,
      error: err.error,
    });
  }
}
