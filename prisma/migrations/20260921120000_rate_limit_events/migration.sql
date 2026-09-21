CREATE TABLE "rate_limit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limit_events_bucket_key_created_at_idx" ON "rate_limit_events"("bucket", "key", "created_at");
CREATE INDEX "rate_limit_events_created_at_idx" ON "rate_limit_events"("created_at");

ALTER TABLE "rate_limit_events" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "rate_limit_events" FROM anon, authenticated;
