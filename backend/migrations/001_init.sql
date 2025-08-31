CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text,
  phone text,
  role text NOT NULL CHECK (role IN ('buyer','company_admin','company_staff','superadmin')) DEFAULT 'buyer',
  company_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  reg_number text,
  contact_email text,
  phone text,
  logo_url text,
  onboarding_state text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  description text,
  unit text NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  stock integer DEFAULT 0,
  active boolean DEFAULT true,
  product_images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES users(id),
  company_id uuid REFERENCES companies(id),
  status text DEFAULT 'draft',
  requested_discount_pct numeric(5,2) DEFAULT 0,
  approved_discount_pct numeric(5,2) DEFAULT 0,
  subtotal numeric(12,2) DEFAULT 0,
  vat numeric(12,2) DEFAULT 0,
  total numeric(12,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  unit_price numeric(12,2) NOT NULL,
  qty integer NOT NULL,
  line_total numeric(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  initiator_id uuid REFERENCES users(id),
  request_pct numeric(5,2),
  company_response text,
  company_counter_pct numeric(5,2),
  note text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id),
  provider text,
  provider_ref text,
  amount numeric(12,2),
  currency text DEFAULT 'BWP',
  status text,
  created_at timestamptz DEFAULT now()
);
