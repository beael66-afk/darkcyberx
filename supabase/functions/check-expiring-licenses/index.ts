import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting check for expiring licenses...");

    // Calculate dates for notifications (7, 3, and 1 day before expiry)
    const today = new Date();
    const notificationDays = [7, 3, 1];
    
    let totalSent = 0;

    for (const days of notificationDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      console.log(`Checking licenses expiring in ${days} days...`);

      // Fetch licenses expiring on the target date
      const { data: licenses, error } = await supabase
        .from("licenses")
        .select(`
          id,
          license_key,
          expire_at,
          customer:customers(id, name, email),
          product:products(id, name)
        `)
        .eq("status", "active")
        .gte("expire_at", targetDate.toISOString())
        .lt("expire_at", nextDay.toISOString());

      if (error) {
        console.error(`Error fetching licenses for ${days} days:`, error);
        continue;
      }

      console.log(`Found ${licenses?.length || 0} licenses expiring in ${days} days`);

      if (licenses && licenses.length > 0) {
        for (const license of licenses) {
          try {
            // Send notification email
            const notificationResponse = await supabase.functions.invoke("send-expiry-notification", {
              body: {
                customerEmail: license.customer.email,
                customerName: license.customer.name,
                licenseKey: license.license_key,
                productName: license.product.name,
                expiryDate: license.expire_at,
                daysRemaining: days,
              },
            });

            if (notificationResponse.error) {
              console.error(`Failed to send notification for license ${license.license_key}:`, notificationResponse.error);
            } else {
              console.log(`Notification sent successfully for license ${license.license_key}`);
              totalSent++;

              // Log the notification
              await supabase.from("logs").insert({
                action: "email_sent",
                details: `إشعار انتهاء الترخيص تم إرساله إلى ${license.customer.email} (${days} أيام متبقية)`,
                entity_type: "license",
                entity_id: license.id,
              });
            }
          } catch (notifError) {
            console.error(`Error processing license ${license.license_key}:`, notifError);
          }
        }
      }
    }

    console.log(`Total notifications sent: ${totalSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `تم إرسال ${totalSent} إشعار بنجاح`,
        totalSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-expiring-licenses function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
