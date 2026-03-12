DROP INDEX IF EXISTS public.rustdesk_ids_customer_id_idx;
CREATE INDEX rustdesk_ids_customer_id_idx ON public.rustdesk_ids (customer_id);