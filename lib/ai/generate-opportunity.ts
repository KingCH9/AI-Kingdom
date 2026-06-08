import type { ClaudeOpportunityResponse } from "@/lib/types";
import { getAnthropicClient } from "./client";
import {
  OPPORTUNITY_GENERATION_MAX_TOKENS,
  OPPORTUNITY_GENERATION_MODEL,
} from "./config";
import { extractTextFromMessage, parseJsonFromClaudeText } from "./parse-response";
import { OPPORTUNITY_GENERATION_PROMPT } from "./prompts/opportunity-generation";

export type GenerateOpportunitySuccess = {
  success: true;
  data: ClaudeOpportunityResponse;
};

export type GenerateOpportunityFailure = {
  success: false;
  message: string;
  raw?: string;
};

export type GenerateOpportunityResult =
  | GenerateOpportunitySuccess
  | GenerateOpportunityFailure;

/**
 * Calls Claude to generate a structured ecommerce opportunity.
 * Returns parsed JSON or a failure result — does not touch the database.
 */
export async function generateOpportunityWithClaude(): Promise<GenerateOpportunityResult> {
  const anthropic = getAnthropicClient();

  const response = await anthropic.messages.create({
    model: OPPORTUNITY_GENERATION_MODEL,
    max_tokens: OPPORTUNITY_GENERATION_MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: OPPORTUNITY_GENERATION_PROMPT,
      },
    ],
  });

  const text = extractTextFromMessage(response);

  if (!text) {
    return {
      success: false,
      message: "Claude returned empty response",
      raw: text,
    };
  }

  try {
    const data = parseJsonFromClaudeText<ClaudeOpportunityResponse>(text);
    return { success: true, data };
  } catch {
    return {
      success: false,
      message: "Claude returned invalid JSON",
      raw: text,
    };
  }
}
