/**
 * Validate and access required environment variables.
 * This module is server-side only — do not import from client components.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  // All vars are lazily evaluated — only throws when the var is actually accessed.
  get floorPlanAiApiKey() { return requireEnv("FLOOR_PLAN_AI_API_KEY"); },
  get floorPlanAiApiUrl() { return requireEnv("FLOOR_PLAN_AI_API_URL"); },
  get stripeSecretKey() { return requireEnv("STRIPE_SECRET_KEY"); },
  get stripeWebhookSecret() { return requireEnv("STRIPE_WEBHOOK_SECRET"); },
  get stripePriceIdHobby() { return requireEnv("STRIPE_PRICE_ID_HOBBY"); },
  get stripePriceIdInvestor() { return requireEnv("STRIPE_PRICE_ID_INVESTOR"); },
  get aiApiKey() { return requireEnv("AI_API_KEY"); },
  get aiApiUrl() { return requireEnv("AI_API_URL"); },
  get aiRelevanceModel() { return process.env.AI_RELEVANCE_MODEL ?? "gpt-4o-mini"; },
  get aiExecutionModel() { return process.env.AI_EXECUTION_MODEL ?? "gpt-4o"; },
  get aiMaxToolIterations() { return parseInt(process.env.AI_MAX_TOOL_ITERATIONS ?? "10", 10); },
};
