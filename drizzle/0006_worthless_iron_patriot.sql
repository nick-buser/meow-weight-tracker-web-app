CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pet_invites" (
	"token" varchar(64) PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"role" "pet_role" NOT NULL,
	"created_by" varchar(256) NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_invites" ADD CONSTRAINT "meow-weight-tracker_pet_invites_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_invites" ADD CONSTRAINT "meow-weight-tracker_pet_invites_created_by_meow-weight-tracker_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."meow-weight-tracker_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_invites" ADD CONSTRAINT "meow-weight-tracker_pet_invites_accepted_by_meow-weight-tracker_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."meow-weight-tracker_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_invites_pet_id_idx" ON "meow-weight-tracker_pet_invites" ("pet_id");