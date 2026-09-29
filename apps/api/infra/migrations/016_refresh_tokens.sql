CREATE TABLE refresh_tokens (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL,        -- SHA-256 of the raw refresh token
  session_id        UUID NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  revocation_reason TEXT,
  ip_address        INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX refresh_tokens_token_hash_idx ON refresh_tokens (token_hash);
CREATE UNIQUE INDEX refresh_tokens_session_id_idx ON refresh_tokens (session_id);

-- Partial index for fast active token lookups (expiry checked in query — now() not IMMUTABLE)
CREATE INDEX refresh_tokens_active_idx ON refresh_tokens (user_id, session_id)
  WHERE revoked_at IS NULL;
