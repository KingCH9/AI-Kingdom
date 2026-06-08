export {
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_MAX_TOKENS,
  OPPORTUNITY_GENERATION_MAX_TOKENS,
  OPPORTUNITY_GENERATION_MODEL,
} from "./config";

export { getAnthropicClient } from "./client";

export { extractTextFromMessage, parseJsonFromClaudeText } from "./parse-response";

export { OPPORTUNITY_GENERATION_PROMPT, buildOpportunityGenerationPrompt } from "./prompts/opportunity-generation";

export {
  generateOpportunityWithClaude,
  type GenerateOpportunityFailure,
  type GenerateOpportunityOptions,
  type GenerateOpportunityResult,
  type GenerateOpportunitySuccess,
} from "./generate-opportunity";

export { askClaude, type AskClaudeOptions } from "./messages";
