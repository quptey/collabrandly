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
  | "request_status"
  | "deal_confirmed"
  | "deal_completed"
  | "deal_disputed"
  | "dispute_resolved"
  | "deal_created"
  | "deal_rejected"
  | "payment_verification"
  | "complaint_approved"
  | "complaint_rejected"
  | "first_payment_confirmed"
  | "work_submitted"
  | "final_payment_confirmed"
  | "deal_review_required";

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
    case "payment_verification":
    case "complaint_approved":
    case "complaint_rejected":
      return "/admin";
    case "deal_confirmed":
    case "deal_completed":
    case "deal_disputed":
    case "dispute_resolved":
    case "deal_created":
    case "first_payment_confirmed":
    case "work_submitted":
    case "final_payment_confirmed":
    case "deal_review_required":
      return "/brand?page=messages";
    default:
      return "/dashboard";
  }
}
