import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "collaboration_request"
  | "campaign_invitation"
  | "campaign_accepted"
  | "campaign_rejected"
  | "profile_approved"
  | "profile_rejected"
  | "save"
  | "new_campaign_matching"
  | "campaign_application"
  | "collaboration_accepted"
  | "collaboration_declined"
  | "campaign_expired"
  | "campaign_closed"
  | "new_verification_request"
  | "report_received"
  | "new_user"
  | "message"
  | "application_update"
  | "brand_request"
  | "request_status";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  recordId?: string;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const { userId, type, title, body, link, recordId } = params;
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? "",
    link: link ?? "/dashboard",
    record_id: recordId ?? null,
  });
}

export function getNotificationRoute(n: any): string {
  if (n.link) return n.link;
  switch (n.type) {
    case "collaboration_request":
    case "brand_request":
      return "/creator?page=collaborations";
    case "campaign_accepted":
    case "campaign_rejected":
    case "campaign_invitation":
      return "/campaigns";
    case "campaign_application":
      return "/brand?page=campaigns";
    case "collaboration_accepted":
      return "/brand?page=messages";
    case "collaboration_declined":
      return "/brand?page=collaborations";
    case "profile_approved":
      return "/dashboard";
    case "profile_rejected":
      return "/onboarding";
    case "message":
      return "/creator?page=messages";
    case "save":
      return "/creator";
    case "application_update":
      return "/dashboard";
    case "new_verification_request":
    case "report_received":
      return "/admin";
    default:
      return "/dashboard";
  }
}
