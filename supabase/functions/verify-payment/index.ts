import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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

    const { sessionId, orderId } = await req.json();
    
    if (!sessionId || !orderId) {
      throw new Error("Missing required fields: sessionId, orderId");
    }

    logStep("Verifying payment", { sessionId, orderId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { paymentStatus: session.payment_status, status: session.status });

    if (session.payment_status === "paid") {
      // Update order status to paid
      const { error: updateError } = await supabaseClient
        .from("orders")
        .update({ 
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", orderId);

      if (updateError) {
        logStep("Order update failed", { error: updateError });
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      logStep("Order updated to paid", { orderId });

      // Get order details
      const { data: order } = await supabaseClient
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        order,
        paymentStatus: session.payment_status,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        paymentStatus: session.payment_status,
        message: "Payment not completed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
