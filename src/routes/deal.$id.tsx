import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { DealChat } from "@/components/deal-chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Clock, Wallet, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/deal/$id")({
  head: () => ({ meta: [{ title: "Сделка — Collabrandly" }] }),
  component: DealPage,
  errorComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F5]">
        <p className="text-muted-foreground">{t("root.pageError")}</p>
      </div>
    );
  },
});

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "dealStatusPending", color: "bg-yellow-100 text-yellow-800 border border-yellow-200", icon: Clock },
  confirmed: { label: "dealStatusInProgress", color: "bg-blue-100 text-blue-800 border border-blue-200", icon: CheckCircle },
  completed: { label: "dealStatusCompleted", color: "bg-green-100 text-green-800 border border-green-200", icon: CheckCircle },
  dispute: { label: "dealStatusDispute", color: "bg-red-100 text-red-800 border border-red-200", icon: AlertTriangle },
  rejected: { label: "dealStatusRejected", color: "bg-gray-100 text-gray-800 border border-gray-200", icon: XCircle },
};

function DealPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeAction, setCompleteAction] = useState<"completed" | "dispute" | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const { data: dealData, isLoading, error } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_deal_with_participants", { p_deal_id: id })
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (dealData) {
      trackEvent("deal_page_viewed", { dealId: id, status: dealData.status });
    }
  }, [!!dealData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (error || !dealData) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="font-display text-3xl text-muted-foreground">{t("root.pageNotFound")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/auth" });
    return null;
  }

  const isBrand = dealData.brand_id === user.id;
  const isCreator = dealData.creator_id === user.id;
  const otherPartyName = isBrand ? dealData.creator_name : dealData.brand_name;
  const otherPartyAvatar = isBrand ? dealData.creator_avatar : dealData.brand_avatar;
  const status = statusConfig[dealData.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  async function handleAccept() {
    const { error } = await supabase
      .from("deals")
      .update({ creator_confirmed: true })
      .eq("id", dealData.deal_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealAccepted"));
    trackEvent("deal_confirmed", { dealId: dealData.deal_id });
    createNotification({
      userId: dealData.brand_id,
      type: "deal_confirmed",
      title: t("trust.notifDealAcceptedTitle"),
      body: t("trust.notifDealAcceptedBody", { title: dealData.title }),
      link: `/deal/${dealData.deal_id}`,
    });
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  async function handleReject() {
    const { error } = await supabase
      .from("deals")
      .update({ status: "rejected", creator_confirmed: false })
      .eq("id", dealData.deal_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealRejected"));
    createNotification({
      userId: dealData.brand_id,
      type: "deal_rejected",
      title: t("trust.notifDealRejectedTitle"),
      body: t("trust.notifDealRejectedBody", { title: dealData.title }),
      link: `/deal/${dealData.deal_id}`,
    });
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  function handleCompleteClick(result: "completed" | "dispute") {
    setCompleteAction(result);
    if (result === "dispute") {
      setCompleteDialogOpen(true);
    } else {
      handleMarkCompleted();
    }
  }

  async function handleMarkCompleted() {
    const { error } = await supabase
      .from("deals")
      .update({ status: "completed" })
      .eq("id", dealData.deal_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealCompleted"));
    trackEvent("deal_completed", { dealId: dealData.deal_id });
    createNotification({
      userId: dealData.creator_id,
      type: "deal_completed",
      title: t("trust.notifDealCompletedTitle"),
      body: t("trust.notifDealCompletedBody", { title: dealData.title }),
      link: `/deal/${dealData.deal_id}`,
    });
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return;
    const { error } = await supabase
      .from("deals")
      .update({ status: "dispute", dispute_reason: disputeReason })
      .eq("id", dealData.deal_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealDisputeOpened"));
    trackEvent("deal_disputed", { dealId: dealData.deal_id, reason: disputeReason });
    const notifyId = isBrand ? dealData.creator_id : dealData.brand_id;
    createNotification({
      userId: notifyId,
      type: "deal_disputed",
      title: t("trust.notifDealDisputedTitle"),
      body: t("trust.notifDealDisputedBody", { title: dealData.title }),
      link: `/deal/${dealData.deal_id}`,
    });
    setCompleteDialogOpen(false);
    setDisputeReason("");
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  async function handleCreatorDispute() {
    const reason = dealData.description || "";
    const { error } = await supabase
      .from("deals")
      .update({ status: "dispute", dispute_reason: reason || t("trust.disputeDeadlineExceeded") })
      .eq("id", dealData.deal_id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealDisputeOpened"));
    trackEvent("deal_disputed", { dealId: dealData.deal_id, reason: "deadline_exceeded" });
    createNotification({
      userId: dealData.brand_id,
      type: "deal_disputed",
      title: t("trust.notifDealDisputedTitle"),
      body: t("trust.notifDealDisputedBody", { title: dealData.title }),
      link: `/deal/${dealData.deal_id}`,
    });
    qc.invalidateQueries({ queryKey: ["deal", id] });
  }

  const deadlineDate = dealData.deadline ? new Date(dealData.deadline) : null;
  const daysPastDeadline = deadlineDate
    ? Math.floor((Date.now() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      <SiteHeader />
      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col flex-1">
        <Link
          to="/marketplace"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        {/* Deal Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-xl font-semibold truncate">{dealData.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isBrand
                  ? t("trust.dealWithCreatorLabel", { name: otherPartyName })
                  : t("trust.dealWithBrandLabel", { name: otherPartyName })}
              </p>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1 inline" />
              {t(`trust.${status.label}`)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">{dealData.amount}</span>
            </div>
            {deadlineDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>{deadlineDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {dealData.description && dealData.status === "pending" && (
            <div className="mt-4 p-3 rounded-2xl bg-secondary/30 text-sm text-muted-foreground">
              {dealData.description}
            </div>
          )}

          {dealData.status === "dispute" && dealData.dispute_reason && (
            <div className="mt-4 p-3 rounded-2xl bg-red-50 text-sm text-red-700">
              <p className="font-medium mb-1">{t("trust.disputeReason")}:</p>
              <p>{dealData.dispute_reason}</p>
            </div>
          )}

          {/* Actions */}
          {dealData.status === "pending" && isCreator && (
            <div className="mt-5 flex gap-3">
              <Button
                className="flex-1 rounded-2xl h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
                onClick={handleAccept}
              >
                {t("trust.acceptProposal")}
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-2xl h-12 text-base text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleReject}
              >
                {t("trust.rejectProposal")}
              </Button>
            </div>
          )}

          {dealData.status === "confirmed" && isBrand && (
            <div className="mt-5">
              <Button
                className="w-full rounded-2xl h-12 text-base font-semibold"
                onClick={() => handleCompleteClick("completed")}
              >
                {t("trust.markCompleted")}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-2xl h-11 mt-2 text-sm"
                onClick={() => handleCompleteClick("dispute")}
              >
                {t("trust.openDispute")}
              </Button>
            </div>
          )}

          {dealData.status === "confirmed" && isCreator && dealData.creator_dispute_available && (
            <div className="mt-5">
              <Button
                variant="outline"
                className="w-full rounded-2xl h-11 text-sm text-destructive border-destructive/30"
                onClick={handleCreatorDispute}
              >
                {t("trust.openDispute")}
              </Button>
            </div>
          )}

          {dealData.status === "confirmed" && isCreator && !dealData.creator_dispute_available && deadlineDate && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              {t("trust.disputeAvailableAfter", { days: Math.max(0, 7 - daysPastDeadline) })}
            </p>
          )}

          {dealData.status === "completed" && (
            <div className="mt-4 p-3 rounded-2xl bg-green-50 text-sm text-green-700 text-center font-medium">
              {t("trust.cooperationCompleted")}
            </div>
          )}

          {dealData.status === "rejected" && (
            <div className="mt-4 p-3 rounded-2xl bg-gray-50 text-sm text-muted-foreground text-center">
              {t("trust.proposalRejected")}
            </div>
          )}
        </div>

        {/* Chat section — only for confirmed+ deals */}
        {dealData.status !== "pending" && dealData.status !== "rejected" && (
          <div className="flex-1 flex flex-col rounded-3xl bg-white shadow-sm border border-border/40 overflow-hidden min-h-[400px]">
            <div className="px-4 py-3 border-b border-border/40 bg-white">
              <h2 className="font-display text-sm font-semibold">{t("trust.chatTitle")}</h2>
            </div>
            <DealChat
              dealId={dealData.deal_id}
              brandId={dealData.brand_id}
              creatorId={dealData.creator_id}
              otherPartyName={otherPartyName}
            />
          </div>
        )}
      </div>

      {/* Dispute Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t("trust.openDispute")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("trust.describeProblem")}</p>
            <Textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={t("trust.problemPlaceholder")}
              rows={3}
            />
            <Button
              className="w-full rounded-2xl h-12"
              disabled={!disputeReason.trim()}
              onClick={handleDispute}
            >
              {t("trust.sendDispute")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
