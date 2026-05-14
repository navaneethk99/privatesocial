ALTER TABLE "user_subscription" ADD COLUMN "daily_message_limit" integer;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "messages_used_today" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "messages_reset_at" timestamp;