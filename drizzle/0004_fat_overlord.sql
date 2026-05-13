CREATE TABLE IF NOT EXISTS "meow-weight-tracker_health_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"title" varchar(256) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"notes" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_health_events" ADD CONSTRAINT "meow-weight-tracker_health_events_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_events_pet_id_idx" ON "meow-weight-tracker_health_events" ("pet_id");