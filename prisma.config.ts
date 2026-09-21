// Used only by the `prisma` CLI (migrate/db push/studio/etc), not by the
// running app — see lib/db/client.ts for the app's own connection, which
// goes through a driver adapter instead, on the POOLED url. This file
// deliberately uses the DIRECT (unpooled) connection: schema migrations
// run DDL over a real session and shouldn't go through a transaction-mode
// pooler.
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Same convention as scripts/seedClinic.mjs etc — the `prisma` CLI runs
// standalone, not through Next.js, so it doesn't get .env.local for free.
loadEnv({ path: ".env.local" });

// `prisma generate` only reads the schema — it never opens a connection — but
// env() throws when the variable is missing, and generate runs from
// postinstall/build on every deploy (including Vercel Preview builds, which
// often don't have DIRECT_URL). So only generate gets a placeholder; every
// command that really connects (migrate, db push, studio…) still fails
// loudly if DIRECT_URL is unset.
const isGenerate = process.argv.includes("generate");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: isGenerate ? (process.env.DIRECT_URL ?? "postgresql://unused@localhost:5432/unused") : env("DIRECT_URL"),
  },
});
