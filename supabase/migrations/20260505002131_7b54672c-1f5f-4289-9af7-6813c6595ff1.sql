
-- 1) Move pg_net out of public (drop + recreate, since pg_net doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 2) Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_customer_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_api_key() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_api_key_by_value(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_api_key_last_used(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_api_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_license_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_expire_licenses() FROM PUBLIC, anon, authenticated;

-- Keep has_role callable by signed-in users (used in RLS policies + Edge Functions)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
