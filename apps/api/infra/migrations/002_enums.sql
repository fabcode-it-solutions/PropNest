CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'agent', 'lender', 'admin');

CREATE TYPE listing_status AS ENUM ('draft', 'active', 'pending', 'sold', 'withdrawn');

CREATE TYPE property_type AS ENUM (
  'single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial'
);

CREATE TYPE offer_status AS ENUM (
  'submitted', 'countered', 'accepted', 'rejected', 'withdrawn', 'expired'
);

CREATE TYPE transaction_status AS ENUM (
  'opened', 'in_escrow', 'closing', 'closed', 'cancelled'
);

CREATE TYPE transaction_doc_category AS ENUM (
  'purchase_agreement', 'inspection_report', 'appraisal',
  'title_report', 'disclosure', 'other'
);

CREATE TYPE mortgage_stage AS ENUM (
  'pre_qualification', 'document_collection', 'document_verification',
  'underwriting_review', 'conditional_approval', 'final_approval',
  'closed', 'denied'
);

CREATE TYPE mortgage_doc_type AS ENUM (
  'w2', 'pay_stub', 'tax_return', 'bank_statement', 'employment_letter', 'other'
);

CREATE TYPE extraction_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE mortgage_condition_status AS ENUM ('open', 'satisfied', 'waived');

CREATE TYPE showing_status AS ENUM ('requested', 'confirmed', 'completed', 'cancelled');

CREATE TYPE alert_frequency AS ENUM ('immediate', 'daily_digest', 'off');
