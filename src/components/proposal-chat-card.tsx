import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X, CheckCheck, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";

interface ProposalChatCardProps {
  dealId: string;
  brandId: string;
  creatorId: string;
}

export function ProposalChatCard({ dealId, brandId, creatorId }: ProposalChatCardProps) {
  const { t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: deal } = useQuery({
    queryKey: ["chat-deal", dealId],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*").eq("id", dealId).single();
      return data;
    },
    refetchInterval: 3000,
  });

  if (!deal) return null;

  const isBrand = user?.id === brandId;
  const isCreator = user?.id === creatorId;
  const isPending = deal.status === "pending" && deal.brand_confirmed && !deal.creator_confirmed;
  const isConfirmed = deal.creator_confirmed;
  const isCompleted = deal.status === "completed";
  const isDispute = deal.status === "dispute";
  const isRejected = deal.status === "rejected";

  async function handleAccept() {
    if (!user) return;
    const { error } = await supabase
      .from("deals")
      .update({ creator_confirmed: true, status: "confirmed" })
      .eq("id", dealId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("trust.dealAccepted"));
    createNotification({
      userId: brandId,
      type: "deal_confirmed",
      title: t("trust.notifDealConfirmedTitle"),
      body: t("trust.notifDealConfirmedBody"),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
    qc.invalidateQueries({ queryKey: ["chat-deal", dealId] });
  }

  async function handleReject() {
    if (!user) return;
    const { error } = await supabase
      .from("deals")
      .update({ status: "rejected" })
      .eq("id", dealId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("trust.dealRejected"));
    createNotification({
      userId: brandId,
      type: "deal_rejected",
      title: t("trust.notifDealRejectedTitle"),
      body: t("trust.notifDealRejectedBody", { title: deal.title }),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
    qc.invalidateQueries({ queryKey: ["chat-deal", dealId] });
  }

  async function handleComplete() {
    if (!user) return;
    const { error } = await supabase
      .from("deals")
      .update({ status: "completed" })
      .eq("id", dealId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("trust.cooperationCompleted"));
    const otherId = isBrand ? creatorId : brandId;
    createNotification({
      userId: otherId,
      type: "deal_completed",
      title: t("trust.notifDealCompletedTitle"),
      body: t("trust.notifDealCompletedBody"),
      link: isBrand ? `/creator?page=messages&chat=${brandId}` : `/brand?page=messages&chat=${creatorId}`,
    });
    qc.invalidateQueries({ queryKey: ["chat-deal", dealId] });
  }

  async function handleDispute() {
    if (!user) return;
    await supabase
      .from("deals")
      .update({ status: "dispute" })
      .eq("id", dealId);
    const otherId = isBrand ? creatorId : brandId;
    createNotification({
      userId: otherId,
      type: "deal_disputed",
      title: t("trust.notifDealDisputedTitle"),
      body: t("trust.notifDealDisputedBody"),
      link: `/admin`,
    });
    qc.invalidateQueries({ queryKey: ["chat-deal", dealId] });
  }

  return (
    <div className="max-w-md">
      {/* Safe deal banner */}
      {isConfirmed && !isCompleted && !isDispute && (
        <div className="mb-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1.5">
            <Shield className="h-3.5 w-3.5" /> {t("trust.safeDealTitle")}
          </div>
          <ol className="space-y-0.5 text-[11px] text-muted-foreground">
            <li>1. {t("trust.safeDealStep1")}</li>
            <li>2. {t("trust.safeDealStep2")}</li>
            <li>3. {t("trust.safeDealStep3")}</li>
            <li>4. {t("trust.safeDealStep4")}</li>
          </ol>
        </div>
      )}

      {/* Proposal card */}
      <div className={`rounded-2xl border-2 p-4 ${
        isCompleted ? "border-green-300 bg-green-50" :
        isDispute ? "border-red-300 bg-red-50" :
        isRejected ? "border-muted bg-muted/20" :
        isConfirmed ? "border-green-300 bg-green-50" :
        "border-accent/30 bg-accent/5"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-sm font-semibold">{deal.title}</span>
          {isCompleted && <span className="text-xs font-semibold text-green-600">✅ {t("trust.dealStatusCompleted")}</span>}
          {isDispute && <span className="text-xs font-semibold text-red-600">🔴 {t("trust.dealStatusDispute")}</span>}
          {isRejected && <span className="text-xs font-semibold text-muted-foreground">❌ {t("trust.proposalRejected")}</span>}
          {isConfirmed && !isCompleted && !isDispute && <span className="text-xs font-semibold text-green-600">✅ {t("trust.dealConfirmed")}</span>}
          {isPending && <span className="text-xs font-semibold text-accent">{t("trust.dealStatusPending")}</span>}
        </div>

        <div className="space-y-1.5 text-sm">
          {deal.amount && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("trust.dealAmount")}</span>
              <span className="font-medium">{deal.amount}</span>
            </div>
          )}
          {deal.deadline && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("trust.dealDeadline")}</span>
              <span className="font-medium">{new Date(deal.deadline).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {deal.description && (
          <p className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap border-t border-border/40 pt-3">
            {deal.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-2">
          {/* Creator: accept/reject */}
          {isCreator && isPending && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 rounded-xl h-9 text-xs font-semibold" onClick={handleAccept}>
                <Check className="mr-1.5 h-3.5 w-3.5" /> {t("trust.acceptProposal")}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9 text-xs" onClick={handleReject}>
                <X className="mr-1.5 h-3.5 w-3.5" /> {t("trust.rejectProposal")}
              </Button>
            </div>
          )}

          {/* Brand waiting for creator response */}
          {isBrand && isPending && (
            <p className="text-[11px] text-muted-foreground text-center">{t("trust.waitingCreator")}</p>
          )}

          {/* Confirm completion / Dispute (when deal is confirmed) */}
          {isConfirmed && !isCompleted && !isDispute && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 rounded-xl h-9 text-xs font-semibold bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> {t("trust.markCompleted")}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={handleDispute}>
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> {t("trust.openDispute")}
              </Button>
            </div>
          )}

          {/* Completed state */}
          {isCompleted && (
            <div className="text-center text-xs font-medium text-green-600 py-1">
              {t("trust.cooperationCompleted")}
            </div>
          )}

          {/* Dispute state */}
          {isDispute && (
            <div className="text-center text-xs font-medium text-red-600 py-1">
              {t("trust.dealDisputeOpened")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
