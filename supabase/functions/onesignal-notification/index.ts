// Follow Deno and Supabase Edge Function conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!

interface NotificationPayload {
  title: string
  message: string
  player_ids?: string[]
  segments?: string[]
  data?: Record<string, unknown>
}

serve(async (req) => {
  try {
    const payload: NotificationPayload = await req.json()
    const { title, message, player_ids, segments, data } = payload

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: "title and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Build OneSignal notification payload
    const notificationPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
    }

    // Add custom data if provided
    if (data) {
      notificationPayload.data = data
    }

    // Target specific players, segments, or default to all subscribed
    if (player_ids && player_ids.length > 0) {
      notificationPayload.include_player_ids = player_ids
    } else if (segments && segments.length > 0) {
      notificationPayload.included_segments = segments
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
