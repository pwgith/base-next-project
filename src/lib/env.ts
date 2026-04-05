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
  get stripeSecretKey() { return requireEnv("STRIPE_SECRET_KEY"); },
  get stripeWebhookSecret() { return requireEnv("STRIPE_WEBHOOK_SECRET"); },
  get stripePriceIdLight() { return requireEnv("STRIPE_PRICE_ID_LIGHT"); },
  get stripePriceIdFull() { return requireEnv("STRIPE_PRICE_ID_FULL"); },
};
