// Postgres (Supabase) — server-only, same reasoning as lib/firebase/admin.ts.
// This is the ONLY file that constructs a PrismaClient; every other file
// under lib/db/ imports `prisma` from here.
//
// Uses the POOLED connection string (Supabase's PgBouncer, port 6543) via
// the @prisma/adapter-pg driver adapter — NOT the direct connection, which
// has a low connection limit that a fresh serverless function per request
// would exhaust fast. Schema migrations use the separate DIRECT connection
// instead (see prisma.config.ts) — the two are intentionally different.
//
// Singleton on globalThis in development only: Next.js hot-reloads modules
// on every save, which would otherwise create a fresh PrismaClient (and a
// fresh connection pool) on every edit instead of reusing one.
import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL. Check .env.local (see .env.local.example) — this must be the " +
      "POOLED Supabase connection string (port 6543), not the direct one."
    );
  }
  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
