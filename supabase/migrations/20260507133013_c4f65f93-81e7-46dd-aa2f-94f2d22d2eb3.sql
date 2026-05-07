-- Extend customer field protection to prevent non-admins from changing identity fields
CREATE OR REPLACE FUNCTION public.protect_customer_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.daily_rate := OLD.daily_rate;
    NEW.account_created := OLD.account_created;
    NEW.user_id := OLD.user_id;
    NEW.email := OLD.email;
    NEW.name := OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_customer_admin_fields_trg ON public.customers;
CREATE TRIGGER protect_customer_admin_fields_trg
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.protect_customer_admin_fields();

-- Storage: allow customers to read their own uploaded receipts (folder = customer auth uid)
CREATE POLICY "Customers read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Table to store pending Telegram link OTPs
CREATE TABLE IF NOT EXISTS public.telegram_link_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint NOT NULL,
  email text NOT NULL,
  customer_id uuid NOT NULL,
  otp_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_telegram_link_otps_chat ON public.telegram_link_otps(telegram_chat_id);
ALTER TABLE public.telegram_link_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage telegram link otps"
ON public.telegram_link_otps FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));