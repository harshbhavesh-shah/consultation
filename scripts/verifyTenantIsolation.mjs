// Verifies the RLS migration actually closed the public REST API: using
// ONLY the publishable (anon) key — the same key every browser gets —
// tries to read every table through PostgREST and fails if any returns rows
// or a non-denied response. Run after applying prisma migrations:
//
//   node --env-file=.env.local scripts/verifyTenantIsolation.mjs
//
// Exits non-zero on any leak so it can gate CI/deploys.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(2);
}

const tables = [
  "clinics", "staff", "patients", "appointments", "attendance", "availability",
  "cash_deposits", "whatsapp_connections", "message_templates",
  "whatsapp_conversations", "whatsapp_messages",
];

let leaks = 0;
for (const table of tables) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const body = await res.json().catch(() => null);
  // Denied = 401/403 (privileges revoked) or 200 with an empty array (RLS).
  const rows = Array.isArray(body) ? body.length : 0;
  const denied = res.status === 401 || res.status === 403 || (res.ok && rows === 0);
  console.log(`${denied ? "ok  " : "LEAK"}  ${table}  (HTTP ${res.status}, ${rows} rows)`);
  if (!denied) leaks++;

  // Writes must be denied too.
  const w = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (w.status < 400) {
    console.log(`LEAK  ${table}  anon INSERT returned HTTP ${w.status}`);
    leaks++;
  }
}
if (leaks) {
  console.error(`\n${leaks} leak(s) found.`);
  process.exit(1);
}
console.log("\nAll tables denied to the anon key.");
