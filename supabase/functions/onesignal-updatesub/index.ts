// Follow Deno and Supabase Edge Function conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID")!
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!

interface UpdateSubscriptionPayload {
  player_id: string
  subscription_status?: boolean
  tags?: Record<string, string | number | boolean>
  external_user_id?: string
}

serve(async (req) => {
  try {
    const payload: UpdateSubscriptionPayload = await req.json()
    const { player_id, subscription_status, tags, external_user_id } = payload

    if (!player_id) {
      return new Response(
        JSON.stringify({ error: "player_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Build OneSignal update payload
    const updatePayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
    }

    // Update subscription status if provided
    if (subscription_status !== undefined) {
      updatePayload.notification_types = subscription_status ? 1 : -2
    }

    // Update tags if provided
    if (tags) {
      updatePayload.tags = tags
    }

    // Update external user ID if provided
    if (external_user_id) {
      updatePayload.external_user_id = external_user_id
    }

    // Update player via OneSignal API
    const response = await fetch(
      `https://onesignal.com/api/v1/players/${player_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify(updatePayload),
      }
    )

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
