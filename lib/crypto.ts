import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// App-level envelope for third-party credentials at rest (currently the
// per-clinic Meta access token and app secret). Database encryption at rest
// protects the disk; this additionally means a leaked DB dump, backup or
// read-only SQL access does not expose live WhatsApp credentials without
// also compromising the app's ENCRYPTION_KEY.
//
// Format: enc:v1:<iv>:<authTag>:<ciphertext>  (base64 parts, AES-256-GCM).
// Values without the prefix are treated as legacy plaintext and returned
// unchanged, so rows written before this existed keep working until
// scripts/encryptWhatsAppCredentials.mjs has been run.

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("Missing ENCRYPTION_KEY (32 random bytes, base64). See .env.local.example.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const [iv, tag, ciphertext] = stored.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
