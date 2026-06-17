-- ============================================================================
-- AI Summarization & Daily Brief – Database Migration
-- ============================================================================
-- Run this against your PostgreSQL database when you have a live connection.
-- Alternatively, run:  cd backend && npx prisma migrate dev --name add_ai_tables
-- Or for a quick push:  cd backend && npx prisma db push
-- ============================================================================

-- 1. Create the ArticleTag table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ArticleTag" (
    "id"        SERIAL       PRIMARY KEY,
    "name"      TEXT         NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ArticleTag_name_idx" ON "ArticleTag"("name");

-- 2. Create the implicit many-to-many join table for Article <-> ArticleTag
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "_ArticleToArticleTag" (
    "A" INTEGER NOT NULL REFERENCES "Article"("id") ON DELETE CASCADE,
    "B" INTEGER NOT NULL REFERENCES "ArticleTag"("id") ON DELETE CASCADE,
    CONSTRAINT "_ArticleToArticleTag_AB_unique" UNIQUE ("A", "B")
);

CREATE INDEX IF NOT EXISTS "_ArticleToArticleTag_B_index" ON "_ArticleToArticleTag"("B");

-- 3. Create the AiSummary table (one-to-one with Article)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AiSummary" (
    "id"                 SERIAL       PRIMARY KEY,
    "articleId"          INTEGER      NOT NULL UNIQUE REFERENCES "Article"("id") ON DELETE CASCADE,
    "headlineSummary"    TEXT         NOT NULL,
    "shortSummary"       TEXT         NOT NULL,
    "keyTakeaways"       JSONB        NOT NULL,
    "whyItMatters"       TEXT         NOT NULL,
    "seoDescription"     TEXT         NOT NULL,
    "sentiment"          TEXT         NOT NULL DEFAULT 'NEUTRAL',
    "sentimentScore"     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "tags"               JSONB        NOT NULL,
    "readingTimeMinutes" INTEGER      NOT NULL DEFAULT 1,
    "confidence"         DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "flaggedForReview"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "provider"           TEXT         NOT NULL DEFAULT 'gemini',
    "modelVersion"       TEXT,
    "generatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AiSummary_flaggedForReview_idx" ON "AiSummary"("flaggedForReview");
CREATE INDEX IF NOT EXISTS "AiSummary_sentiment_idx"        ON "AiSummary"("sentiment");

-- 4. Create the DailyBrief table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "DailyBrief" (
    "id"          SERIAL       PRIMARY KEY,
    "date"        TIMESTAMP(3) NOT NULL UNIQUE,
    "title"       TEXT         NOT NULL,
    "content"     TEXT         NOT NULL,
    "articleIds"  JSONB        NOT NULL,
    "categories"  JSONB        NOT NULL,
    "isPublished" BOOLEAN      NOT NULL DEFAULT TRUE,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DailyBrief_date_idx"        ON "DailyBrief"("date");
CREATE INDEX IF NOT EXISTS "DailyBrief_isPublished_idx" ON "DailyBrief"("isPublished");

-- 5. Add VerificationStatus to Article and create VerificationReport table
-- ----------------------------------------------------------------------------
-- Create custom type/enum if it doesn't exist (using raw text in SQL for simplicity, or postgres DOMAIN/ENUM)
DO $$ BEGIN
    CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING_REPORTS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

CREATE TABLE IF NOT EXISTS "VerificationReport" (
    "id"                  SERIAL       PRIMARY KEY,
    "articleId"           INTEGER      NOT NULL UNIQUE REFERENCES "Article"("id") ON DELETE CASCADE,
    "status"              "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "credibilityScore"    INTEGER      NOT NULL DEFAULT 100,
    "sourcesCount"        INTEGER      NOT NULL DEFAULT 1,
    "whyVerified"         TEXT         NOT NULL,
    "scoreExplanation"    TEXT         NOT NULL,
    "supportingSources"   JSONB        NOT NULL,
    "headlineSensational"  BOOLEAN      NOT NULL DEFAULT FALSE,
    "headlineClickbait"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "misleadingContent"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "missingEvidence"     JSONB        NOT NULL,
    "unsupportedClaims"   JSONB        NOT NULL,
    "duplicateIds"        JSONB        NOT NULL,
    "verifiedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFlagged"           BOOLEAN      NOT NULL DEFAULT FALSE,
    "overrideStatus"      "VerificationStatus",
    "overrideCredibility" INTEGER,
    "overrideReason"      TEXT,
    "overriddenAt"        TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "VerificationReport_isFlagged_idx" ON "VerificationReport"("isFlagged");
CREATE INDEX IF NOT EXISTS "VerificationReport_status_idx"    ON "VerificationReport"("status");

-- ============================================================================
-- Verification: check all tables exist
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('AiSummary', 'DailyBrief', 'ArticleTag', '_ArticleToArticleTag', 'VerificationReport')
-- ORDER BY table_name;
