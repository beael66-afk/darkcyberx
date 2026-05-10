-- Restrict api_keys writes to admins only; keep SELECT for owners
DROP POLICY IF EXISTS "Users manage own API keys" ON public.api_keys;

CREATE POLICY "Owners view own API keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Extend customer field protection to also lock phone and company for non-admins
CREATE OR REPLACE FUNCTION public.protect_customer_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.daily_rate := OLD.daily_rate;
    NEW.account_created := OLD.account_created;
    NEW.user_id := OLD.user_id;
    NEW.email := OLD.email;
    NEW.name := OLD.name;
    NEW.phone := OLD.phone;
    NEW.company := OLD.company;
  END IF;
  RETURN NEW;
END;
$function$;
