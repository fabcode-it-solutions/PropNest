CREATE TABLE mortgage_applications (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id                 UUID NOT NULL REFERENCES users(id),
  transaction_id           UUID REFERENCES transactions(id),
  lender_id                UUID REFERENCES users(id),
  stage                    mortgage_stage NOT NULL DEFAULT 'pre_qualification',
  loan_type                TEXT NOT NULL,
  loan_amount              NUMERIC(12,2) NOT NULL CHECK (loan_amount > 0),
  property_value           NUMERIC(12,2) NOT NULL CHECK (property_value > 0),
  ltv                      NUMERIC(5,2) GENERATED ALWAYS AS (
                             ROUND((loan_amount / NULLIF(property_value, 0)) * 100, 2)
                           ) STORED,
  credit_score             SMALLINT CHECK (credit_score BETWEEN 300 AND 850),
  annual_income            NUMERIC(12,2),
  monthly_income           NUMERIC(10,2),
  monthly_debt             NUMERIC(10,2),
  pre_approval_letter_s3_key TEXT,
  pre_approval_amount      NUMERIC(12,2),
  denial_reason            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mortgage_apps_buyer_stage_idx ON mortgage_applications (buyer_id, stage);
CREATE INDEX mortgage_apps_lender_stage_idx ON mortgage_applications (lender_id, stage);
CREATE INDEX mortgage_apps_stage_idx ON mortgage_applications (stage);

CREATE TRIGGER mortgage_applications_updated_at
  BEFORE UPDATE ON mortgage_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
