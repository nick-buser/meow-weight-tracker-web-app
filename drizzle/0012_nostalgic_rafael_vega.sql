DO $$ BEGIN
 CREATE TYPE "public"."appointment_status" AS ENUM('Scheduled', 'Completed', 'Cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pet_appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"appointment_type" varchar(64) NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"location" varchar(256),
	"notes" varchar(2048),
	"status" "appointment_status" DEFAULT 'Scheduled' NOT NULL,
	"created_by" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_appointments" ADD CONSTRAINT "meow-weight-tracker_pet_appointments_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_appointments" ADD CONSTRAINT "meow-weight-tracker_pet_appointments_created_by_meow-weight-tracker_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."meow-weight-tracker_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_appointments_pet_id_idx" ON "meow-weight-tracker_pet_appointments" ("pet_id");