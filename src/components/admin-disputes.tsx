import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface AdminDisputesPanelProps {
  qc: any;
}

export function AdminDisputesPanel({ qc }: AdminDisputesPanelProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Record<string, string>>({});

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*, creator:profiles!deals_creator_id_fkey(display_name), brand:profiles!deals_brand_id_fkey(display_name)")
        .eq("status", "dispute")
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  async function saveComment(dealId: string) {
    const comment = comments[dealId];
    if (!comment?.trim()) return;
    const { error } = await supabase
      .from("deals")
      .update({ internal_comment: comment })
      .eq("id", dealId);
    if (error) return toast.error(error.message);
    toast.success(t("admin.commentSaved"));
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  }

  async function markResolved(dealId: string, brandId: string, creatorId: string) {
    const { error } = await supabase
      .from("deals")
      .update({ status: "completed" })
      .eq("id", dealId);
    if (error) return toast.error(error.message);
    toast.success(t("admin.disputeResolved"));
    createNotification({
      userId: brandId,
      type: "dispute_resolved",
      title: t("trust.notifDisputeResolvedTitle"),
      body: t("trust.notifDisputeResolvedBody"),
      link: `/deal/${dealId}`,
    });
    createNotification({
      userId: creatorId,
      type: "dispute_resolved",
      title: t("trust.notifDisputeResolvedTitle"),
      body: t("trust.notifDisputeResolvedBody"),
      link: `/deal/${dealId}`,
    });
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-2xl font-semibold">{t("admin.disputes")}</h2>
        {disputes.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive border border-destructive/30">
            {disputes.length}
          </span>
        )}
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
          {t("admin.noDisputes")}
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => (
            <div key={d.id} className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{d.title || t("trust.deal")}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {d.creator?.display_name} ↔ {d.brand?.display_name}
                  </span>
                  {d.amount && <span className="ml-2 text-sm text-muted-foreground">({d.amount})</span>}
                </div>
                <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive shrink-0">
                  {t("trust.dealStatusDispute")}
                </span>
              </div>
              {d.dispute_reason && (
                <div className="rounded-xl bg-destructive/5 p-3">
                  <p className="text-xs font-medium text-destructive">{t("admin.disputeReason")}</p>
                  <p className="text-sm mt-1">{d.dispute_reason}</p>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t("admin.internalComment")}</p>
                <Textarea
                  value={comments[d.id] ?? d.internal_comment ?? ""}
                  onChange={(e) => setComments((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  placeholder={t("admin.commentPlaceholder")}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => saveComment(d.id)}>
                    {t("admin.saveComment")}
                  </Button>
                  <Button size="sm" variant="success" onClick={() => markResolved(d.id, d.brand_id, d.creator_id)}>
                    {t("admin.markResolved")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate({ to: `/deal/${d.id}` })}>
                    {t("admin.viewDeal")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
