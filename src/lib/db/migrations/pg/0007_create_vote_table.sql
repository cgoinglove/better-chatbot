-- Create vote table with correct schema
CREATE TABLE IF NOT EXISTS "vote" (
  "thread_id" UUID NOT NULL,
  "message_id" TEXT NOT NULL,
  "is_upvoted" BOOLEAN NOT NULL,
  CONSTRAINT "vote_pkey" PRIMARY KEY ("thread_id", "message_id"),
  CONSTRAINT "vote_thread_id_fkey" FOREIGN KEY ("thread_id") 
    REFERENCES "chat_thread"("id") 
    ON DELETE CASCADE
);

-- Add comment for documentation
COMMENT ON TABLE "vote" IS 'Stores user votes on chat messages';

-- Create index for faster lookups by thread_id
CREATE INDEX IF NOT EXISTS "vote_thread_id_idx" ON "vote" ("thread_id");
