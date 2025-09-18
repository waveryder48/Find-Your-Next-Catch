create type trip_source as enum ('FR','HM','OTHER');
create type fare_tier_type as enum ('ADULT','JUNIOR','SENIOR','MILITARY','STUDENT','OTHER');

create table landings (
  id text primary key,
  name varchar(256) not null,
  slug varchar(256) not null unique,
  website varchar(512) not null unique,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index landings_name_idx on landings(name);

create table vessels (
  id text primary key,
  name varchar(256) not null,
  slug varchar(256) not null unique,
  primary_website varchar(512),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index vessels_name_idx on vessels(name);

create table vessel_landings (
  vessel_id text not null references vessels(id) on delete cascade,
  landing_id text not null references landings(id) on delete cascade,
  vessel_page_url varchar(1024) not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  primary key (vessel_id, landing_id)
);

create index vessel_landings_landing_idx on vessel_landings(landing_id);
create index vessel_landings_url_idx on vessel_landings(vessel_page_url);

create table trips (
  id text primary key,
  source trip_source not null,
  source_trip_id text not null,
  source_url varchar(1024) not null,
  landing_id text not null references landings(id) on delete cascade,
  vessel_id text references vessels(id) on delete set null,
  title varchar(256) not null,
  notes text,
  passport_req boolean not null default false,
  meals_incl boolean not null default false,
  permits_incl boolean not null default false,
  depart_local timestamp not null,
  return_local timestamp,
  timezone varchar(64) not null default 'America/Los_Angeles',
  load integer,
  spots integer,
  status varchar(32) not null,
  price_includes_fees boolean not null default false,
  service_fee_pct numeric(4,1),
  last_scraped_at timestamp not null default now(),
  created_at timestamp not null default now(),
  updated_at timestamp not null default now(),
  unique (source, source_trip_id)
);

create index trips_depart_idx on trips(landing_id, depart_local);
create index trips_vessel_idx on trips(vessel_id);

create table fare_tiers (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  type fare_tier_type not null,
  label varchar(80) not null,
  price_cents integer not null,
  currency varchar(3) not null default 'USD',
  min_age integer,
  max_age integer,
  conditions varchar(256)
);

create index fare_tiers_trip_idx on fare_tiers(trip_id);

create table trip_promotions (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  slug varchar(80) not null,
  summary varchar(256) not null,
  details text,
  applies_when varchar(80)
);

create index trip_promotions_trip_idx on trip_promotions(trip_id);
