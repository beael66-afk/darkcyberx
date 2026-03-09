
-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Users view own roles"
ON public.user_roles
AS PERMISSIVE FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles
AS PERMISSIVE FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
