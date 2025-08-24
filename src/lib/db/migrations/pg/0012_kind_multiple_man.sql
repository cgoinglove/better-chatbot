ALTER TABLE "chat_message" ADD COLUMN IF NOT EXISTS "metadata" json;--> statement-breakpoint

DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns 
			  WHERE table_name = 'chat_message' AND column_name = 'attachments') THEN
		ALTER TABLE "chat_message" DROP COLUMN "attachments";
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns 
			  WHERE table_name = 'chat_message' AND column_name = 'annotations') THEN
		ALTER TABLE "chat_message" DROP COLUMN "annotations";
	END IF;
END $$;
--> statement-breakpoint
DO $$ 
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns 
			  WHERE table_name = 'chat_message' AND column_name = 'model') THEN
		ALTER TABLE "chat_message" DROP COLUMN "model";
	END IF;
END $$;