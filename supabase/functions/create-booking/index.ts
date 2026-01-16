import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOKING] ${step}${detailsStr}`);
};

// Google Calendar API helper functions
async function getGoogleAccessToken(credentials: any): Promise<string> {
  // TODO: Implement OAuth2 token refresh using service account credentials
  // The GOOGLE_CALENDAR_CREDENTIALS secret should contain a service account JSON
  // This function should use the credentials to get an access token
  
  const { client_email, private_key } = credentials;
  
  // Create JWT for service account
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  // Note: Full RS256 signing implementation would go here
  // For now, this is a placeholder that shows the structure
  throw new Error("GOOGLE_CALENDAR_CREDENTIALS not configured - please add service account credentials");
}

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendeeEmail: string;
  }
): Promise<{ id: string; htmlLink: string }> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: "America/New_York",
        },
        end: {
          dateTime: event.end,
          timeZone: "America/New_York",
        },
        attendees: [
          { email: event.attendeeEmail },
        ],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  return response.json();
}

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

    const { orderId, scheduledAt } = await req.json();
    
    if (!orderId || !scheduledAt) {
      throw new Error("Missing required fields: orderId, scheduledAt");
    }

    logStep("Creating booking", { orderId, scheduledAt });

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message}`);
    }

    if (order.tier !== "coaching") {
      throw new Error("Bookings are only available for coaching tier");
    }

    if (order.status !== "paid") {
      throw new Error("Order must be paid before booking");
    }

    logStep("Order validated", { tier: order.tier, email: order.email });

    // Create booking in database first
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .insert({
        order_id: orderId,
        scheduled_at: scheduledAt,
        confirmed: false,
      })
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Failed to create booking: ${bookingError.message}`);
    }

    logStep("Booking created in database", { bookingId: booking.id });

    // Try to create Google Calendar event
    let googleEventId = null;
    let calendarError = null;

    const credentialsJson = Deno.env.get("GOOGLE_CALENDAR_CREDENTIALS");
    const calendarId = Deno.env.get("GOOGLE_CALENDAR_ID");

    if (credentialsJson && calendarId) {
      try {
        const credentials = JSON.parse(credentialsJson);
        const accessToken = await getGoogleAccessToken(credentials);
        
        const startTime = new Date(scheduledAt);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour session

        const calendarEvent = await createCalendarEvent(accessToken, calendarId, {
          summary: `Signal Coaching Session - ${order.full_name}`,
          description: `Coaching session with ${order.full_name} (${order.email})`,
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          attendeeEmail: order.email,
        });

        googleEventId = calendarEvent.id;
        logStep("Calendar event created", { eventId: googleEventId });

        // Update booking with calendar event ID
        await supabaseClient
          .from("bookings")
          .update({ google_event_id: googleEventId, confirmed: true })
          .eq("id", booking.id);

      } catch (error) {
        calendarError = error instanceof Error ? error.message : String(error);
        logStep("Calendar integration failed", { error: calendarError });
      }
    } else {
      calendarError = "Google Calendar credentials not configured";
      logStep("Calendar credentials missing");
    }

    // Update order status
    await supabaseClient
      .from("orders")
      .update({ status: "booked" })
      .eq("id", orderId);

    return new Response(JSON.stringify({ 
      success: true, 
      booking: {
        ...booking,
        google_event_id: googleEventId,
      },
      calendarIntegration: !calendarError,
      calendarError,
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
