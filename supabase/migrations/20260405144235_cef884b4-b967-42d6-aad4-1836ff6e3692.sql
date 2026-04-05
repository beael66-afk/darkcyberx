-- Protect admin-only fields on customers table from non-admin updates
CREATE OR REPLACE FUNCTION public.protect_customer_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Non-admin users cannot change these fields
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.daily_rate := OLD.daily_rate;
    NEW.account_created := OLD.account_created;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lock_customer_admin_fields
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_customer_admin_fields();

-- Add UPDATE policy on payment-receipts storage bucket for admins
CREATE POLICY "Admins can update payment receipts"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'payment-receipts' AND has_role(auth.uid(), 'admin'::app_role));