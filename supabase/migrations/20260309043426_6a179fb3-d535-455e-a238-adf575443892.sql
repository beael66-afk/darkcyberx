-- Drop any overly permissive policies that may exist
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view licenses" ON public.licenses;
DROP POLICY IF EXISTS "Authenticated users can view devices" ON public.devices;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.logs;

-- Ensure proper admin-only policies exist (idempotent - will not fail if already exists)
DO $$
BEGIN
  -- Customers table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Admins can manage customers') THEN
    CREATE POLICY "Admins can manage customers" ON public.customers
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Licenses table  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'licenses' AND policyname = 'Admins can manage licenses') THEN
    CREATE POLICY "Admins can manage licenses" ON public.licenses
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Devices table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'devices' AND policyname = 'Admins can manage devices') THEN
    CREATE POLICY "Admins can manage devices" ON public.devices
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Logs table - ensure admin-only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logs' AND policyname = 'Admins can view logs') THEN
    CREATE POLICY "Admins can view logs" ON public.logs
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logs' AND policyname = 'Admins can insert logs') THEN
    CREATE POLICY "Admins can insert logs" ON public.logs
      FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'logs' AND policyname = 'Admins can delete logs') THEN
    CREATE POLICY "Admins can delete logs" ON public.logs
      FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;