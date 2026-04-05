
-- Fix blocked_hwids policy: change from public to authenticated
DROP POLICY IF EXISTS "Admins can manage blocked hwids" ON public.blocked_hwids;
CREATE POLICY "Admins can manage blocked hwids"
  ON public.blocked_hwids
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix revoked_keys policy: change from public to authenticated
DROP POLICY IF EXISTS "Admins can manage revoked keys" ON public.revoked_keys;
CREATE POLICY "Admins can manage revoked keys"
  ON public.revoked_keys
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
