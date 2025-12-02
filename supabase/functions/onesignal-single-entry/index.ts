// Follow Deno and Supabase Edge Function conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!

interface EntryPayload {
  visitor_name: string
  property_id?: string
  host_id?: string
  record_uid?: string
  player_ids?: string[]
}

serve(async (req) => {
  try {
    const payload: EntryPayload = await req.json()
    const { visitor_name, player_ids } = payload

    if (!visitor_name) {
      return new Response(
        JSON.stringify({ error: "visitor_name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Build OneSignal notification payload
    const notificationPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: "Arrival Notification!" },
      contents: { en: `${visitor_name} has just arrived.` },
    }

    // Target specific players or use segments
    if (player_ids && player_ids.length > 0) {
      notificationPayload.include_player_ids = player_ids
    } else {
      notificationPayload.included_segments = ["Subscribed Users"]
    }

    // Send notification via OneSignal API
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, onesignal_response: result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
