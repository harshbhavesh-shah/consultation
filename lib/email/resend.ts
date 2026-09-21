import "server-only";
import { Resend } from "resend";

// Lazily created so `next build` doesn't need a real key — only a request
// that actually sends does.
let _client: Resend | undefined;

function getClient(): Resend {
  if (_client) return _client;
  const apiKey = process.env.RESEND_KEY_ID;
  if (!apiKey) throw new Error("Missing RESEND_KEY_ID. See .env.local.example.");
  _client = new Resend(apiKey);
  return _client;
}

/**
 * Sends a transactional email through Resend. Without a verified sending
 * domain, Resend's default onboarding@resend.dev sender can only deliver to
 * the address that owns the Resend account — fine for development; real
 * delivery needs a verified domain and RESEND_FROM_EMAIL on it.
 *
 * Throws on failure: callers (the Supabase send-email hook) must surface the
 * error so a failed email never looks like a successful one.
 */
export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL || "Loupe <onboarding@resend.dev>";
  const { error } = await getClient().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) throw new Error(`Resend send failed: ${error.name}`);
}
