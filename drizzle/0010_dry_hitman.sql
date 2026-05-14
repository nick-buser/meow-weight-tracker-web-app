DO $$ BEGIN
 CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_user_preferences" (
	"user_id" varchar(256) PRIMARY KEY NOT NULL,
	"weight_unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"daily_reminders_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_user_preferences" ADD CONSTRAINT "meow-weight-tracker_user_preferences_user_id_meow-weight-tracker_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."meow-weight-tracker_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
