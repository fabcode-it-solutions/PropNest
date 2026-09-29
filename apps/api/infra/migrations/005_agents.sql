CREATE TABLE agents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number    TEXT NOT NULL,
  agency_name       TEXT NOT NULL,
  bio               TEXT,
  specializations   TEXT[] NOT NULL DEFAULT '{}',
  service_area_zips TEXT[] NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX agents_user_id_idx ON agents (user_id);
CREATE UNIQUE INDEX agents_license_idx ON agents (license_number);
