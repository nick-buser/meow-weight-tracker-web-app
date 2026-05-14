CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pet_meds" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"name" varchar(256) NOT NULL,
	"dosage" varchar(128),
	"frequency_hours" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"last_given_at" timestamp with time zone,
	"notes" varchar(1024),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_meds" ADD CONSTRAINT "meow-weight-tracker_pet_meds_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_meds_pet_id_idx" ON "meow-weight-tracker_pet_meds" ("pet_id");