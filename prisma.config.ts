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

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
});
