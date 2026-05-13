DO $$ BEGIN
 CREATE TYPE "public"."pet_role" AS ENUM('Owner', 'Editor', 'Viewer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_eating_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"fed_at" timestamp with time zone NOT NULL,
	"quantity_grams" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pet_food" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"brand" varchar(256),
	"calories_per_gram" real NOT NULL,
	"protein_percent" real,
	"fat_percent" real,
	"carbs_percent" real,
	"notes" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pet_people" (
	"user_id" varchar(256) NOT NULL,
	"pet_id" integer NOT NULL,
	"role" "pet_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meow-weight-tracker_pet_people_user_id_pet_id_pk" PRIMARY KEY("user_id","pet_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"species" varchar(64) NOT NULL,
	"gender" varchar(16) NOT NULL,
	"name" varchar(128) NOT NULL,
	"birth_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_users" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meow-weight-tracker_weight_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"weighed_at" timestamp with time zone NOT NULL,
	"weight" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_eating_history" ADD CONSTRAINT "meow-weight-tracker_eating_history_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_eating_history" ADD CONSTRAINT "meow-weight-tracker_eating_history_food_id_meow-weight-tracker_pet_food_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."meow-weight-tracker_pet_food"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_people" ADD CONSTRAINT "meow-weight-tracker_pet_people_user_id_meow-weight-tracker_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."meow-weight-tracker_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_pet_people" ADD CONSTRAINT "meow-weight-tracker_pet_people_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meow-weight-tracker_weight_history" ADD CONSTRAINT "meow-weight-tracker_weight_history_pet_id_meow-weight-tracker_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."meow-weight-tracker_pets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eating_history_pet_id_idx" ON "meow-weight-tracker_eating_history" ("pet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_food_name_idx" ON "meow-weight-tracker_pet_food" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_people_user_id_idx" ON "meow-weight-tracker_pet_people" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_people_pet_id_idx" ON "meow-weight-tracker_pet_people" ("pet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "weight_history_pet_id_idx" ON "meow-weight-tracker_weight_history" ("pet_id");