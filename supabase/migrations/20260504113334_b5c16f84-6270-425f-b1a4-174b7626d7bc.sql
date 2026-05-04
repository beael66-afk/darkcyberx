-- Remove unused tables from realtime publication to prevent unauthorized subscriptions
ALTER PUBLICATION supabase_realtime DROP TABLE public.customers;
ALTER PUBLICATION supabase_realtime DROP TABLE public.devices;
ALTER PUBLICATION supabase_realtime DROP TABLE public.licenses;
ALTER PUBLICATION supabase_realtime DROP TABLE public.logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.products;
ALTER PUBLICATION supabase_realtime DROP TABLE public.telegram_links;