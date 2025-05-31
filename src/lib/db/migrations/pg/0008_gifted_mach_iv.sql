ALTER TABLE "vote" RENAME COLUMN "chat_id" TO "thread_id";--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_chat_id_chat_thread_id_fk";
--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_message_id_chat_message_id_fk";
--> statement-breakpoint
ALTER TABLE "vote" DROP CONSTRAINT "vote_chat_id_message_id_pk";--> statement-breakpoint
ALTER TABLE "vote" ALTER COLUMN "message_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_thread_id_message_id_pk" PRIMARY KEY("thread_id","message_id");--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_thread_id_chat_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_thread"("id") ON DELETE no action ON UPDATE no action;