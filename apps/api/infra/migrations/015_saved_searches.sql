CREATE TABLE saved_searches (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  filters          JSONB NOT NULL DEFAULT '{}',
  alert_frequency  alert_frequency NOT NULL DEFAULT 'immediate',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  last_matched_at  TIMESTAMPTZ,
  last_alerted_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX saved_searches_buyer_active_idx ON saved_searches (buyer_id, is_active);
CREATE INDEX saved_searches_filters_gin_idx ON saved_searches USING GIN (filters);
