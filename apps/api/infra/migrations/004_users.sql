CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL,
  password_hash TEXT,                    -- NULL for OAuth-only accounts
  role          user_role NOT NULL DEFAULT 'buyer',
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  oauth_provider TEXT,                   -- 'google' | NULL
  oauth_id      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_idx ON users (email);
CREATE INDEX users_role_idx ON users (role);
CREATE UNIQUE INDEX users_oauth_idx ON users (oauth_provider, oauth_id)
  WHERE oauth_provider IS NOT NULL;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
