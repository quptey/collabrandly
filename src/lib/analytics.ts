import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "collabrandly_session";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}

let sessionId = getSessionId();
let userId: string | null = null;

export function setAnalyticsUser(id: string | null) {
  userId = id;
}

export function trackEvent(
  eventName: string,
  metadata?: Record<string, unknown>,
) {
  try {
    supabase.from("analytics_events").insert({
      event_name: eventName,
      user_id: userId,
      session_id: sessionId,
      metadata: metadata ?? {},
    }).then().catch(() => {});
  } catch {
    // silent fail
  }
}
