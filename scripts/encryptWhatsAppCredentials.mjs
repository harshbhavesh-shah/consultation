// One-off backfill: encrypts any plaintext WhatsApp access tokens / app
// secrets already in whatsapp_connections (rows written before
// lib/crypto.ts existed). Idempotent — already-encrypted values are skipped.
// Same AES-256-GCM format as lib/crypto.ts.
//
//   1. Generate a key:   openssl rand -base64 32
//   2. Set ENCRYPTION_KEY in .env.local AND in Vercel, then deploy.
//   3. Run:              node --env-file=.env.local scripts/encryptWhatsAppCredentials.mjs
import { createCipheriv, randomBytes } from "node:crypto";
import pg from "pg";

const PREFIX = "enc:v1:";
const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");
if (key.length !== 32) {
  console.error("ENCRYPTION_KEY must be set and decode to exactly 32 bytes.");
  process.exit(1);
}

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

// DIRECT_URL (unpooled) — a one-off script wants a real session.
const client = new pg.Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query("select clinic_id, access_token, app_secret from whatsapp_connections");
  let updated = 0;
  for (const row of rows) {
    const needsToken = !row.access_token.startsWith(PREFIX);
    const needsSecret = !row.app_secret.startsWith(PREFIX);
    if (!needsToken && !needsSecret) continue;
    await client.query("update whatsapp_connections set access_token = $2, app_secret = $3 where clinic_id = $1", [
      row.clinic_id,
      needsToken ? encrypt(row.access_token) : row.access_token,
      needsSecret ? encrypt(row.app_secret) : row.app_secret,
    ]);
    updated++;
  }
  console.log(`Encrypted credentials for ${updated} of ${rows.length} connection(s).`);
} finally {
  await client.end();
}
