-- Create many-to-many relationship between licenses and products
CREATE TABLE IF NOT EXISTS public.license_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(license_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_license_products_license ON public.license_products(license_id);
CREATE INDEX IF NOT EXISTS idx_license_products_product ON public.license_products(product_id);

ALTER TABLE public.license_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage license_products"
  ON public.license_products
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers view own license_products"
  ON public.license_products
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM licenses l
    JOIN customers c ON c.id = l.customer_id
    WHERE l.id = license_products.license_id
    AND c.user_id = auth.uid()
  ));

-- Migrate existing licenses: copy current product_id into the new join table
INSERT INTO public.license_products (license_id, product_id)
SELECT id, product_id FROM public.licenses
WHERE product_id IS NOT NULL
ON CONFLICT (license_id, product_id) DO NOTHING;

-- Optional: max products limit per license (NULL = unlimited)
ALTER TABLE public.licenses
  ADD COLUMN IF NOT EXISTS max_products integer;