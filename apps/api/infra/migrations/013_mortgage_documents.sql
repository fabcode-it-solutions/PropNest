CREATE TABLE mortgage_documents (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id       UUID NOT NULL REFERENCES mortgage_applications(id) ON DELETE CASCADE,
  uploader_id          UUID NOT NULL REFERENCES users(id),
  doc_type             mortgage_doc_type NOT NULL,
  s3_key               TEXT NOT NULL,
  filename             TEXT NOT NULL,
  size_bytes           BIGINT NOT NULL,
  textract_job_id      TEXT,
  extraction_status    extraction_status NOT NULL DEFAULT 'pending',
  extracted_data       JSONB,
  confidence_scores    JSONB,
  reviewed             BOOLEAN NOT NULL DEFAULT false,
  reviewer_id          UUID REFERENCES users(id),
  reviewer_corrections JSONB,
  uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX mortgage_documents_s3_key_idx ON mortgage_documents (s3_key);
CREATE INDEX mortgage_documents_app_type_idx ON mortgage_documents (application_id, doc_type);
CREATE INDEX mortgage_documents_extraction_idx ON mortgage_documents (extraction_status)
  WHERE extraction_status IN ('pending', 'processing');
CREATE INDEX mortgage_documents_textract_job_idx ON mortgage_documents (textract_job_id)
  WHERE textract_job_id IS NOT NULL;
CREATE INDEX mortgage_documents_extracted_data_gin_idx ON mortgage_documents USING GIN (extracted_data);
