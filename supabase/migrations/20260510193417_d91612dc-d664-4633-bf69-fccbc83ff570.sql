-- Composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_license_hwid ON public.devices(license_id, hwid);
CREATE INDEX IF NOT EXISTS idx_logs_created_entity_type ON public.logs(created_at DESC, entity_type);
CREATE INDEX IF NOT EXISTS idx_licenses_expire_status ON public.licenses(expire_at, status);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_status_created ON public.renewal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_devices_last_verified ON public.devices(last_verified DESC);