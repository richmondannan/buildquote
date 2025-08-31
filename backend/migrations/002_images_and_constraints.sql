ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_images jsonb DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS products_name_idx ON products USING gin (to_tsvector('english', name));
ALTER TABLE products
  ADD CONSTRAINT products_unit_price_nonnegative CHECK (unit_price >= 0);
