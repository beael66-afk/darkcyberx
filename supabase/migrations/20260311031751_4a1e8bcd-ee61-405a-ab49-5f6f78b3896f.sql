
CREATE TABLE public.telegram_delegates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  delegate_chat_id BIGINT NOT NULL,
  delegate_name TEXT,
  permissions TEXT[] NOT NULL DEFAULT ARRAY['view_licenses', 'renew_licenses', 'manage_devices', 'manage_rustdesk'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_customer_id, delegate_chat_id)
);

ALTER TABLE public.telegram_delegates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage telegram delegates"
ON public.telegram_delegates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
