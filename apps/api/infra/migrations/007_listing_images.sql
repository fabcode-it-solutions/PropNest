CREATE TABLE listing_images (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id           UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL,
  url                  TEXT NOT NULL,
  width                INTEGER NOT NULL,
  height               INTEGER NOT NULL,
  sort_order           SMALLINT NOT NULL DEFAULT 0,
  is_primary           BOOLEAN NOT NULL DEFAULT false,
  uploaded_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX listing_images_listing_order_idx ON listing_images (listing_id, sort_order);
CREATE INDEX listing_images_primary_idx ON listing_images (listing_id, is_primary);
