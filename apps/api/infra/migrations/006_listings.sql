CREATE TABLE listings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id          UUID NOT NULL REFERENCES users(id),
  seller_id         UUID NOT NULL REFERENCES users(id),
  status            listing_status NOT NULL DEFAULT 'draft',
  property_type     property_type NOT NULL,
  address_line1     TEXT NOT NULL,
  city              TEXT NOT NULL,
  state             TEXT NOT NULL,
  zip               TEXT NOT NULL,
  location          GEOMETRY(Point, 4326) NOT NULL,
  price             NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  bedrooms          SMALLINT NOT NULL CHECK (bedrooms >= 0),
  bathrooms         NUMERIC(3,1) NOT NULL CHECK (bathrooms >= 0),
  sqft              INTEGER NOT NULL CHECK (sqft > 0),
  year_built        SMALLINT,
  description       TEXT,
  features          JSONB NOT NULL DEFAULT '{}',
  slug              TEXT NOT NULL,
  hoa_monthly       NUMERIC(8,2),
  primary_image_url TEXT,              -- denormalized Cloudinary URL
  listed_at         TIMESTAMPTZ,
  pending_at        TIMESTAMPTZ,
  sold_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX listings_slug_idx ON listings (slug);
CREATE INDEX listings_status_idx ON listings (status);
CREATE INDEX listings_agent_id_idx ON listings (agent_id);
CREATE INDEX listings_city_state_status_idx ON listings (city, state, status);
CREATE INDEX listings_price_idx ON listings (price);
CREATE INDEX listings_beds_baths_idx ON listings (bedrooms, bathrooms);
CREATE INDEX listings_features_gin_idx ON listings USING GIN (features);
CREATE INDEX listings_location_gist_idx ON listings USING GIST (location);

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
