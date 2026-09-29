-- Insert-only audit log. No FK on resource_id so entries survive entity deletion.
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID,                     -- nullable: system actions have no user
  action        TEXT NOT NULL,            -- e.g. 'document.downloaded'
  resource_type TEXT NOT NULL,            -- e.g. 'transaction_document'
  resource_id   UUID NOT NULL,
  old_values    JSONB,
  new_values    JSONB,
  metadata      JSONB NOT NULL DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_user_created_idx ON audit_logs (user_id, created_at);
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id, created_at);
