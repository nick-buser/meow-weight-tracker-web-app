CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pet_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"body" varchar(4096) NOT NULL,
	"written_at" timestamp with time zone NOT NULL,
	"written_by" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_notes" ADD CONSTRAINT "meow-weight-tracker_pet_notes_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_notes" ADD CONSTRAINT "meow-weight-tracker_pet_notes_written_by_meow-weight-tracker_users_id_fk" FOREIGN KEY ("written_by") REFERENCES "public"."meow-weight-tracker_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_notes_pet_id_idx" ON "meow-weight-tracker_pet_notes" ("pet_id");