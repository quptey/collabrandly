import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { Check, X, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface AdminComplaintModerationPanelProps {
  qc: any;
}

export function AdminComplaintModerationPanel({ qc }: AdminComplaintModerationPanelProps) {
  const { t } = useT();

  const { data: pendingReviews = [], isLoading } = useQuery({
    queryKey: ["admin-pending-complaints"],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_reviews")
        .select("*, profiles!creator_reviews_creator_id_fkey(display_name)")
        .eq("status", "failed")
        .eq("moderation_status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  async function approveComplaint(reviewId: string) {
    const { error } = await supabase.rpc("approve_complaint", { p_review_id: reviewId });
    if (error) return toast.error(error.message);
    toast.success(t("admin.complaintApproved"));
    qc.invalidateQueries({ queryKey: ["admin-pending-complaints"] });
    qc.invalidateQueries({ queryKey: ["admin-reputation"] });
  }

  async function rejectComplaint(reviewId: string) {
    const { error } = await supabase.rpc("reject_complaint", { p_review_id: reviewId });
    if (error) return toast.error(error.message);
    toast.success(t("admin.complaintRejected"));
    qc.invalidateQueries({ queryKey: ["admin-pending-complaints"] });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-2xl font-semibold">{t("admin.complaintModeration")}</h2>
        {pendingReviews.length > 0 && (
          <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning border border-warning/30">
            {pendingReviews.length}
          </span>
        )}
      </div>

      {pendingReviews.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
          {t("admin.noPendingComplaints")}
        </div>
      ) : (
        <div className="space-y-4">
          {pendingReviews.map((r: any) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{r.profiles?.display_name ?? "—"}</span>
                  {r.profiles && (
                    <Link to="/creator/$id" params={{ id: r.creator_id }}>
                      <Button variant="ghost" size="icon" title={t("admin.viewProfile")}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.complaint && (
                <div className="rounded-xl bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive">{t("admin.complaintText")}</p>
                  <p className="text-sm mt-1">{r.complaint}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => approveComplaint(r.id)}>
                  <Check className="mr-1 h-4 w-4" />
                  {t("admin.approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectComplaint(r.id)}>
                  <X className="mr-1 h-4 w-4" />
                  {t("admin.reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
