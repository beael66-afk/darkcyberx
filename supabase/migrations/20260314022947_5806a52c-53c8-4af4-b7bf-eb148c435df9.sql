CREATE TABLE public.telegram_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  delegate_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  used_by_chat_id bigint,
  used_at timestamptz
);

ALTER TABLE public.telegram_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invite codes" ON public.telegram_invite_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));