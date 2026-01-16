import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBMIT-INTAKE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { 
      orderId, 
      fullName, 
      email, 
      currentStatus, 
      targetRoles, 
      biggestChallenge,
      resumeUrl 
    } = await req.json();
    
    if (!orderId || !fullName || !email || !currentStatus || !targetRoles || !biggestChallenge) {
      throw new Error("Missing required fields");
    }

    logStep("Submitting intake", { orderId, email });

    // Verify order exists and is paid
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    if (order.status !== "paid" && order.status !== "booked") {
      throw new Error("Order must be paid before submitting intake");
    }

    // Create intake response
    const { data: intake, error: intakeError } = await supabaseClient
      .from("intake_responses")
      .insert({
        order_id: orderId,
        full_name: fullName,
        email,
        current_status: currentStatus,
        target_roles: targetRoles,
        biggest_challenge: biggestChallenge,
        resume_url: resumeUrl,
      })
      .select()
      .single();

    if (intakeError) {
      throw new Error(`Failed to create intake: ${intakeError.message}`);
    }

    logStep("Intake created", { intakeId: intake.id });

    // Update order status based on tier
    const newStatus = order.tier === "coaching" ? "intake_complete" : "processing";
    await supabaseClient
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    return new Response(JSON.stringify({ 
      success: true, 
      intake,
      nextStep: order.tier === "coaching" ? "booking" : "complete",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
