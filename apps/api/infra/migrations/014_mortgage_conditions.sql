CREATE TABLE mortgage_conditions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES mortgage_applications(id) ON DELETE CASCADE,
  description    TEXT NOT NULL,
  status         mortgage_condition_status NOT NULL DEFAULT 'open',
  created_by     UUID NOT NULL REFERENCES users(id),
  resolved_by    UUID REFERENCES users(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mortgage_conditions_app_status_idx ON mortgage_conditions (application_id, status);
