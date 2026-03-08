import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Rate limiting configuration
const rateLimitWindow = 60000; // 1 minute
const maxRequestsPerWindow = 30;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

function checkRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(apiKey);
  if (!limitData || now > limitData.resetTime) {
    rateLimitMap.set(apiKey, { count: 1, resetTime: now + rateLimitWindow });
    return true;
  }
  if (limitData.count >= maxRequestsPerWindow) return false;
  limitData.count++;
  return true;
}

// Extract real client IP from request headers
function getClientIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

// License key pattern: XXXX-XXXX-XXXX-XXXX (alphanumeric uppercase)
const LICENSE_KEY_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIp = getClientIp(req);

    // ── IP Block Check ─────────────────────────────────
    const { data: blockedIp } = await supabase
      .from('blocked_ips')
      .select('id, reason')
      .eq('ip_address', clientIp)
      .maybeSingle();

    if (blockedIp) {
      console.warn(`Blocked IP attempted access: ${clientIp}`);
      // Log blocked attempt
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: `Blocked IP attempted license validation`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'Access denied', valid: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: 'محاولة تفعيل بدون مفتاح API',
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'Missing API key', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!checkRateLimit(apiKey)) {
      console.warn(`Rate limit exceeded for API key prefix: ${apiKey.substring(0, 8)}...`);
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: `تجاوز حد الطلبات - مفتاح: ${apiKey.substring(0, 8)}...`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.', valid: false }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .rpc('validate_api_key_by_value', { api_key_value: apiKey })
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Invalid API key attempt detected');
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: `محاولة تفعيل بمفتاح API غير صالح - البادئة: ${apiKey.substring(0, 8)}...`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'Invalid API key', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyData.is_active) {
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: `محاولة تفعيل بمفتاح API معطّل - البادئة: ${apiKey.substring(0, 8)}...`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'API key is inactive', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: `محاولة تفعيل بمفتاح API منتهي الصلاحية - البادئة: ${apiKey.substring(0, 8)}...`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'API key has expired', valid: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.rpc('update_api_key_last_used', { api_key_value: apiKey });

    // Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { license_key, hwid, device_name, os_info } = body;

    if (!license_key || typeof license_key !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing license key', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LICENSE_KEY_PATTERN.test(license_key)) {
      return new Response(
        JSON.stringify({ error: 'Invalid license key format', valid: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safeHwid = hwid && typeof hwid === 'string' ? hwid.slice(0, 255) : undefined;
    const safeDeviceName = device_name && typeof device_name === 'string' ? device_name.slice(0, 200) : undefined;
    const safeOsInfo = os_info && typeof os_info === 'string' ? os_info.slice(0, 200) : undefined;

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select(`*, customer:customers(*), product:products(*)`)
      .eq('license_key', license_key)
      .single();

    if (licenseError || !license) {
      console.log('License validation failed: key not found');
      await supabase.from('logs').insert({
        entity_type: 'security',
        action: 'verified',
        description: `محاولة تفعيل بمفتاح غير موجود: ${license_key}`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: 'License not found', valid: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (license.status !== 'active') {
      return new Response(
        JSON.stringify({
          error: `License is ${license.status}`,
          valid: false,
          license: { key: license.license_key, status: license.status }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (license.expire_at && new Date(license.expire_at) < new Date()) {
      return new Response(
        JSON.stringify({
          error: 'License has expired',
          valid: false,
          license: { key: license.license_key, status: 'expired', expire_at: license.expire_at }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (safeHwid) {
      // Check if this HWID exists but is disabled (blocked device)
      const { data: blockedDevice } = await supabase
        .from('devices')
        .select('id, is_active')
        .eq('license_id', license.id)
        .eq('hwid', safeHwid)
        .eq('is_active', false)
        .maybeSingle();

      if (blockedDevice) {
        console.warn(`Blocked device attempted validation: ${safeHwid.substring(0, 16)}...`);
        await supabase.from('logs').insert({
          entity_type: 'security',
          action: 'verified',
          description: `Blocked device attempted license validation`,
          ip_address: clientIp,
        });
        return new Response(
          JSON.stringify({
            error: 'Device is blocked. Please contact support.',
            valid: false,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: devices } = await supabase
        .from('devices')
        .select('*')
        .eq('license_id', license.id)
        .eq('is_active', true);

      const deviceCount = devices?.length || 0;
      const existingDevice = devices?.find(d => d.hwid === safeHwid);

      if (!existingDevice && deviceCount >= license.max_devices) {
        return new Response(
          JSON.stringify({
            error: 'Maximum devices reached',
            valid: false,
            license: { key: license.license_key, max_devices: license.max_devices, current_devices: deviceCount }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingDevice) {
        await supabase
          .from('devices')
          .update({
            last_verified: new Date().toISOString(),
            device_name: safeDeviceName || existingDevice.device_name,
            os_info: safeOsInfo || existingDevice.os_info
          })
          .eq('id', existingDevice.id);
      } else {
        await supabase
          .from('devices')
          .insert({
            license_id: license.id,
            hwid: safeHwid,
            device_name: safeDeviceName,
            os_info: safeOsInfo,
            last_verified: new Date().toISOString()
          });
      }
    }

    // Log with IP address
    await supabase
      .from('logs')
      .insert({
        entity_type: 'license',
        entity_id: license.id,
        action: 'verified',
        description: `License validated via API`,
        user_id: apiKeyData.user_id,
        ip_address: clientIp,
      });

    return new Response(
      JSON.stringify({
        valid: true,
        license: {
          key: license.license_key,
          status: license.status,
          expire_at: license.expire_at,
          max_devices: license.max_devices,
          customer: license.customer?.name,
          product: license.product?.name
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-license function:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error', valid: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
