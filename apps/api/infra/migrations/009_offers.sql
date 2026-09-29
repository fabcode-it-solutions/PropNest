CREATE TABLE offers (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id              UUID NOT NULL REFERENCES listings(id),
  buyer_id                UUID NOT NULL REFERENCES users(id),
  agent_id                UUID REFERENCES users(id),
  parent_offer_id         UUID REFERENCES offers(id),   -- self-reference for counter chain
  price                   NUMERIC(12,2) NOT NULL CHECK (price > 0),
  status                  offer_status NOT NULL DEFAULT 'submitted',
  financing_contingency   BOOLEAN NOT NULL DEFAULT true,
  inspection_contingency  BOOLEAN NOT NULL DEFAULT true,
  appraisal_contingency   BOOLEAN NOT NULL DEFAULT true,
  closing_date            DATE NOT NULL,
  earnest_money           NUMERIC(10,2) NOT NULL CHECK (earnest_money >= 0),
  message                 TEXT,
  expiry_at               TIMESTAMPTZ,
  idempotency_key         UUID NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX offers_idempotency_key_idx ON offers (idempotency_key);
CREATE INDEX offers_listing_status_idx ON offers (listing_id, status);
CREATE INDEX offers_buyer_idx ON offers (buyer_id);
CREATE INDEX offers_parent_idx ON offers (parent_offer_id) WHERE parent_offer_id IS NOT NULL;

CREATE TRIGGER offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
