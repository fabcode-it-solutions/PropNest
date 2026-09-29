CREATE TABLE showings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id          UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id            UUID NOT NULL REFERENCES users(id),
  agent_id            UUID NOT NULL REFERENCES users(id),
  status              showing_status NOT NULL DEFAULT 'requested',
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    SMALLINT NOT NULL DEFAULT 30,
  notes               TEXT,
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  reminder_24h_sent   BOOLEAN NOT NULL DEFAULT false,
  reminder_1h_sent    BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX showings_listing_at_idx ON showings (listing_id, scheduled_at);
CREATE INDEX showings_agent_at_idx ON showings (agent_id, scheduled_at);
CREATE INDEX showings_buyer_idx ON showings (buyer_id);

-- Partial index for reminder jobs: upcoming confirmed showings not yet reminded
CREATE INDEX showings_reminder_24h_idx ON showings (scheduled_at)
  WHERE status = 'confirmed' AND reminder_24h_sent = false;
CREATE INDEX showings_reminder_1h_idx ON showings (scheduled_at)
  WHERE status = 'confirmed' AND reminder_1h_sent = false;
