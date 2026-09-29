CREATE TABLE transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id     UUID NOT NULL REFERENCES listings(id),
  offer_id       UUID NOT NULL REFERENCES offers(id),
  buyer_id       UUID NOT NULL REFERENCES users(id),
  seller_id      UUID NOT NULL REFERENCES users(id),
  agent_id       UUID NOT NULL REFERENCES users(id),
  status         transaction_status NOT NULL DEFAULT 'opened',
  closing_date   DATE,
  sale_price     NUMERIC(12,2) NOT NULL,
  escrow_company TEXT,
  closed_at      TIMESTAMPTZ,
  cancelled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX transactions_listing_id_idx ON transactions (listing_id);
CREATE UNIQUE INDEX transactions_offer_id_idx ON transactions (offer_id);
CREATE INDEX transactions_buyer_status_idx ON transactions (buyer_id, status);
CREATE INDEX transactions_agent_status_idx ON transactions (agent_id, status);
