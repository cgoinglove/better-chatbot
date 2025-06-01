ALTER TABLE "suggestion" RENAME COLUMN "content" TO "suggested_text";--> statement-breakpoint
ALTER TABLE "vote" RENAME COLUMN "chat_id" TO "thread_id";--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_chat_id_chat_thread_id_fk";
--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_message_id_chat_message_id_fk";
--> statement-breakpoint
ALTER TABLE "document" DROP CONSTRAINT "document_id_pk";--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_chat_id_message_id_pk";--> statement-breakpoint
ALTER TABLE "vote" ALTER COLUMN "message_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_id_created_at_pk" PRIMARY KEY("id","created_at");--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_thread_id_message_id_pk" PRIMARY KEY("thread_id","message_id");--> statement-breakpoint
ALTER TABLE "suggestion" ADD COLUMN "original_text" text NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestion" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "suggestion" ADD COLUMN "is_resolved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestion" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_document_id_document_created_at_document_id_created_at_fk" FOREIGN KEY ("document_id","document_created_at") REFERENCES "public"."document"("id","created_at") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_thread_id_chat_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_thread"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" DROP COLUMN "kind";