import "server-only";
import { prisma } from "@/lib/db/client";

const PRUNE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Fixed-window rate limit backed by Postgres (serverless functions share no
 * memory, so an in-process counter wouldn't hold). Records this attempt
 * whether or not it's allowed, so a client that keeps hammering stays
 * blocked instead of the window quietly resetting. Fails OPEN if the
 * database errors — a rate-limiter outage should degrade to "unprotected",
 * not take booking and login down with it.
 */
export async function checkRateLimit(opts: {
  bucket: string;
  key: string;
  max: number;
  windowMs: number;
}): Promise<{ allowed: boolean }> {
  try {
    const now = Date.now();
    const recent = await prisma.rateLimitEvent.count({
      where: { bucket: opts.bucket, key: opts.key, createdAt: { gte: new Date(now - opts.windowMs) } },
    });
    await prisma.rateLimitEvent.create({ data: { bucket: opts.bucket, key: opts.key } });

    // Housekeeping on ~5% of calls rather than every one.
    if (Math.random() < 0.05) {
      await prisma.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(now - PRUNE_AFTER_MS) } } });
    }
    return { allowed: recent < opts.max };
  } catch (err) {
    console.error("Rate limit check failed (allowing request):", err);
    return { allowed: true };
  }
}
