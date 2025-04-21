CREATE TABLE IF NOT EXISTS "file" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "filename" text NOT NULL,
  "original_filename" text NOT NULL,
  "path" text NOT NULL,
  "mimetype" text NOT NULL,
  "size" integer NOT NULL,
  "user_id" text NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "file_attachment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "file_id" uuid NOT NULL,
  "message_id" uuid NOT NULL,
  "filename" text NOT NULL,
  "mimetype" text NOT NULL,
  "url" text NOT NULL,
  "thumbnail_url" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "file_attachment_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE CASCADE,
  CONSTRAINT "file_attachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_message"("id") ON DELETE CASCADE
);
