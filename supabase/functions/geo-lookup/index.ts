import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ip = url.searchParams.get("ip");

    if (!ip) {
      return new Response(
        JSON.stringify({ error: "Missing ip parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate IP format
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^[0-9a-fA-F:]+$/;
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return new Response(
        JSON.stringify({ error: "Invalid IP address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ip-api.com is HTTP-only on free tier but works fine server-side (no CORS issues)
    const fields = "status,message,continent,continentCode,country,countryCode,region,regionName,city,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query";
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=${fields}`);
    
    if (!geoRes.ok) {
      throw new Error(`ip-api.com returned ${geoRes.status}`);
    }

    const data = await geoRes.json();

    if (data.status !== "success") {
      return new Response(
        JSON.stringify({ error: data.message || "Lookup failed" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("geo-lookup error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
