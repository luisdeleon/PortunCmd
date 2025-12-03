// Follow Deno and Supabase Edge Function conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// OneSignal credentials (matching the working onesignal-notification function)
const ONESIGNAL_APP_ID = "2fb91d7c-5470-41e7-ae42-74d5fc7ed65e"
const ONESIGNAL_API_KEY = "MTRhNjA0NGQtYTVkOC00OGUyLWFjOGEtNTM2MjJjZmJkMmYx"

interface EntryPayload {
  visitor_name: string
  property_name?: string
  property_id?: string
  host_id?: string
  record_uid?: string
  player_ids?: string[]
}

serve(async (req) => {
  try {
    const payload: EntryPayload = await req.json()
    const { visitor_name, property_name, player_ids } = payload

    // Log received payload for debugging
    console.log("=== ONESIGNAL ENTRY NOTIFICATION ===")
    console.log("Received payload:", JSON.stringify(payload))
    console.log("ONESIGNAL_APP_ID configured:", !!ONESIGNAL_APP_ID)
    console.log("ONESIGNAL_API_KEY configured:", !!ONESIGNAL_API_KEY)

    if (!visitor_name) {
      console.log("ERROR: visitor_name is required")
      return new Response(
        JSON.stringify({ error: "visitor_name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Build OneSignal notification payload with multilingual support
    const notificationPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: {
        en: "🔔 Visitor Arrival",
        es: "🔔 Llegada de Visitante",
        pt: "🔔 Chegada de Visitante"
      },
      contents: {
        en: property_name ? `${visitor_name} has arrived to ${property_name}` : `${visitor_name} has arrived`,
        es: property_name ? `${visitor_name} ha llegado a ${property_name}` : `${visitor_name} ha llegado`,
        pt: property_name ? `${visitor_name} chegou a ${property_name}` : `${visitor_name} chegou`
      },
    }

    // Target specific players or use segments
    let result: Record<string, unknown>

    if (player_ids && player_ids.length > 0) {
      console.log("Trying player_ids first:", JSON.stringify(player_ids))
      notificationPayload.include_player_ids = player_ids

      console.log("Sending to OneSignal:", JSON.stringify(notificationPayload))

      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(notificationPayload),
      })

      result = await response.json()
      console.log("OneSignal response:", JSON.stringify(result))

      // Check if all players are unsubscribed, fallback to segment
      if (result.errors && Array.isArray(result.errors) &&
          result.errors.some((e: string) => e.includes("not subscribed"))) {
        console.log("Player_ids failed (unsubscribed), falling back to Subscribed Users segment")

        // Remove player_ids and use segment instead
        delete notificationPayload.include_player_ids
        notificationPayload.included_segments = ["Subscribed Users"]

        const fallbackResponse = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
          },
          body: JSON.stringify(notificationPayload),
        })

        result = await fallbackResponse.json()
        console.log("Fallback OneSignal response:", JSON.stringify(result))
      }
    } else {
      console.log("No player_ids provided, using Subscribed Users segment")
      notificationPayload.included_segments = ["Subscribed Users"]

      console.log("Sending to OneSignal:", JSON.stringify(notificationPayload))

      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(notificationPayload),
      })

      result = await response.json()
      console.log("OneSignal response:", JSON.stringify(result))
    }

    console.log("=== END ONESIGNAL ENTRY ===")

    return new Response(
      JSON.stringify({ success: true, onesignal_response: result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.log("ERROR in onesignal-single-entry:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
