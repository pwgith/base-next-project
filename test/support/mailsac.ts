/**
 * Mailsac API helper for retrieving verification emails during end-to-end tests.
 *
 * Mailsac (https://mailsac.com) is a disposable email service with an HTTP API.
 * Any email sent to `{anything}@mailsac.com` is publicly readable — no inbox
 * reservation is required.  An API key is still needed to avoid rate limiting.
 *
 * Environment variable required: MAILSAC_API_KEY
 */

const MAILSAC_BASE = "https://mailsac.com/api";

function getApiKey(): string {
  const key = process.env.MAILSAC_API_KEY;
  if (!key) {
    throw new Error(
      "MAILSAC_API_KEY environment variable is not set. " +
        "Get a free key at https://mailsac.com/api-keys and add it to .env.local.",
    );
  }
  return key;
}

interface MailsacMessage {
  _id: string;
  subject: string;
  received: string;
  /** URLs extracted from the email body by Mailsac. */
  links: string[];
}

async function listMessages(
  email: string,
  afterDate: Date,
): Promise<MailsacMessage[]> {
  const response = await fetch(
    `${MAILSAC_BASE}/addresses/${encodeURIComponent(email)}/messages`,
    { headers: { "Mailsac-Key": getApiKey() } },
  );
  if (!response.ok) {
    throw new Error(
      `Mailsac listMessages failed: ${response.status} ${await response.text()}`,
    );
  }
  const messages = (await response.json()) as MailsacMessage[];
  // Messages are returned newest-first; filter to only those received after
  // the test started so stale emails from prior runs are ignored.
  return messages.filter((m) => new Date(m.received) > afterDate);
}

/**
 * Fetch full message metadata for a single message.
 * The metadata includes the `links` array — URLs extracted from the body —
 * which avoids having to parse the raw email content.
 */
async function getMessageMetadata(
  email: string,
  messageId: string,
): Promise<MailsacMessage> {
  const response = await fetch(
    `${MAILSAC_BASE}/addresses/${encodeURIComponent(email)}/messages/${messageId}`,
    { headers: { "Mailsac-Key": getApiKey() } },
  );
  if (!response.ok) {
    throw new Error(
      `Mailsac getMessageMetadata failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.json() as Promise<MailsacMessage>;
}

/**
 * Fetch the plain-text body of a message.
 * Used as a fallback when link extraction from metadata is insufficient.
 */
export async function getMessageText(
  email: string,
  messageId: string,
): Promise<string> {
  const response = await fetch(
    `${MAILSAC_BASE}/text/${encodeURIComponent(email)}/${messageId}`,
    { headers: { "Mailsac-Key": getApiKey() } },
  );
  if (!response.ok) {
    throw new Error(
      `Mailsac getMessageText failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.text();
}

/**
 * Poll the Mailsac inbox until at least one message arrives that was received
 * after `afterDate`, then return its full metadata (including extracted `links`).
 *
 * Throws if no message arrives within `timeoutMs`.
 */
export async function waitForEmail(
  email: string,
  afterDate: Date,
  timeoutMs = 60_000,
  intervalMs = 3_000,
): Promise<MailsacMessage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messages = await listMessages(email, afterDate);
    if (messages.length > 0) {
      // Fetch full metadata so we get the `links` array.
      const metadata = await getMessageMetadata(email, messages[0]._id);
      return metadata;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `No email arrived at ${email} within ${timeoutMs}ms (looking for messages after ${afterDate.toISOString()})`,
  );
}

/**
 * Extract the Supabase email-verification URL from a message.
 *
 * Primary: scan the pre-parsed `links` array from Mailsac message metadata.
 * Fallback: regex against the raw plain-text body if links are empty.
 *
 * Supabase sends emails through SendGrid which wraps links in tracking URLs.
 * We accept both direct Supabase links and SendGrid tracking links, as
 * Playwright will follow the redirect to the actual verification endpoint.
 *
 * Returns null when no verification URL can be found.
 */
export function extractVerificationLink(
  links: string[],
  textFallback?: string,
): string | null {
  const isVerificationUrl = (url: string): boolean =>
    url.includes("auth/v1/verify") ||
    url.includes("token_hash") ||
    url.includes("type=signup");

  // Check for SendGrid/email tracking URLs (used by Supabase for email delivery)
  const isTrackingUrl = (url: string): boolean =>
    url.includes("sendgrid") ||
    url.includes("sendibt") ||
    url.includes("/tr/cl/"); // SendGrid click tracking pattern

  const fromLinks = links.find(isVerificationUrl);
  if (fromLinks) return fromLinks;

  // Fall back to tracking URLs if no direct verification link found
  const trackingLink = links.find(isTrackingUrl);
  if (trackingLink) return trackingLink;

  if (textFallback) {
    // Try direct Supabase verification URLs first
    const match = textFallback.match(
      /https?:\/\/[^\s<>"]+(?:verify|token_hash|type=signup)[^\s<>"']*/,
    );
    if (match) return match[0];

    // Fall back to SendGrid tracking URLs
    const trackingMatch = textFallback.match(
      /https?:\/\/[^\s<>"']*(?:sendgrid|sendibt|\/tr\/cl\/)[^\s<>"']*/,
    );
    if (trackingMatch) return trackingMatch[0];
  }

  return null;
}
