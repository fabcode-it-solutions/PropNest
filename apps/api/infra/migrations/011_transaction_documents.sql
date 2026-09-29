CREATE TABLE transaction_documents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id      UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  uploader_id         UUID NOT NULL REFERENCES users(id),
  category            transaction_doc_category NOT NULL,
  s3_key              TEXT NOT NULL,
  filename            TEXT NOT NULL,
  size_bytes          BIGINT NOT NULL,
  mime_type           TEXT NOT NULL,
  version             SMALLINT NOT NULL DEFAULT 1,
  is_current_version  BOOLEAN NOT NULL DEFAULT true,
  download_count      INTEGER NOT NULL DEFAULT 0,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX transaction_documents_s3_key_idx ON transaction_documents (s3_key);
CREATE INDEX transaction_documents_txn_cat_idx ON transaction_documents (transaction_id, category);
CREATE INDEX transaction_documents_txn_current_idx ON transaction_documents (transaction_id, is_current_version);
