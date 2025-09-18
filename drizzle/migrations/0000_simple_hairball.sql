DO $$ BEGIN
 CREATE TYPE "public"."fare_tier_type" AS ENUM('ADULT', 'JUNIOR', 'SENIOR', 'MILITARY', 'STUDENT', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."trip_source" AS ENUM('FR', 'HM', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fare_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"type" "fare_tier_type" NOT NULL,
	"label" varchar(80) NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"min_age" integer,
	"max_age" integer,
	"conditions" varchar(256)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "landings" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"slug" varchar(256) NOT NULL,
	"website" varchar(512) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "landings_slug_unique" UNIQUE("slug"),
	CONSTRAINT "landings_website_unique" UNIQUE("website")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_promotions" (
	"id" text PRIMARY KEY NOT NULL,
	"trip_id" text NOT NULL,
	"slug" varchar(80) NOT NULL,
	"summary" varchar(256) NOT NULL,
	"details" text,
	"applies_when" varchar(80)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "trip_source" NOT NULL,
	"source_trip_id" text NOT NULL,
	"source_url" varchar(1024) NOT NULL,
	"landing_id" text NOT NULL,
	"vessel_id" text,
	"title" varchar(256) NOT NULL,
	"notes" text,
	"passport_req" boolean DEFAULT false NOT NULL,
	"meals_incl" boolean DEFAULT false NOT NULL,
	"permits_incl" boolean DEFAULT false NOT NULL,
	"depart_local" timestamp NOT NULL,
	"return_local" timestamp,
	"timezone" varchar(64) DEFAULT 'America/Los_Angeles' NOT NULL,
	"load" integer,
	"spots" integer,
	"status" varchar(32) NOT NULL,
	"price_includes_fees" boolean DEFAULT false NOT NULL,
	"service_fee_pct" numeric(4, 1),
	"last_scraped_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vessel_landings" (
	"vessel_id" text NOT NULL,
	"landing_id" text NOT NULL,
	"vessel_page_url" varchar(1024) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vessel_landings_pk" PRIMARY KEY("vessel_id","landing_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vessels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"slug" varchar(256) NOT NULL,
	"primary_website" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vessels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fare_tiers" ADD CONSTRAINT "fare_tiers_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_promotions" ADD CONSTRAINT "trip_promotions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_landing_id_landings_id_fk" FOREIGN KEY ("landing_id") REFERENCES "public"."landings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vessel_landings" ADD CONSTRAINT "vessel_landings_vessel_id_vessels_id_fk" FOREIGN KEY ("vessel_id") REFERENCES "public"."vessels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vessel_landings" ADD CONSTRAINT "vessel_landings_landing_id_landings_id_fk" FOREIGN KEY ("landing_id") REFERENCES "public"."landings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fare_tiers_trip_idx" ON "fare_tiers" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "landings_name_idx" ON "landings" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_promotions_trip_idx" ON "trip_promotions" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trips_source_tripid_idx" ON "trips" USING btree ("source","source_trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_depart_idx" ON "trips" USING btree ("landing_id","depart_local");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_vessel_idx" ON "trips" USING btree ("vessel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vessel_landings_landing_idx" ON "vessel_landings" USING btree ("landing_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vessel_landings_url_idx" ON "vessel_landings" USING btree ("vessel_page_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vessels_name_idx" ON "vessels" USING btree ("name");