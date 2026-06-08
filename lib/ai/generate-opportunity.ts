import type { ClaudeOpportunityResponse } from "@/lib/types";
import { getAnthropicApiKey } from "@/lib/env";
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
  if (!getAnthropicApiKey()) {
    console.error("[generate-opportunity] ANTHROPIC_API_KEY is not configured");
    return {
      success: false,
      message: "ANTHROPIC_API_KEY is not configured — set it in Railway Variables",
    };
  }

  try {
    console.log(
      `[generate-opportunity] Calling Claude model=${OPPORTUNITY_GENERATION_MODEL}`
    );
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
      console.warn("[generate-opportunity] Claude returned empty response");
      return {
        success: false,
        message: "Claude returned empty response",
        raw: text,
      };
    }

    try {
      const data = parseJsonFromClaudeText<ClaudeOpportunityResponse>(text);
      console.log(
        `[generate-opportunity] Parsed opportunity: ${data.productName ?? "(unnamed)"}`
      );
      return { success: true, data };
    } catch {
      console.warn("[generate-opportunity] Claude returned invalid JSON");
      return {
        success: false,
        message: "Claude returned invalid JSON",
        raw: text.slice(0, 500),
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Claude API request failed";
    console.error("[generate-opportunity] Claude API error:", message, error);
    return {
      success: false,
      message: `Claude API error: ${message}`,
    };
  }
}
