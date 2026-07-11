import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Check, X, CheckCheck, AlertTriangle, Shield,
  SendHorizonal, DollarSign, Clock, CircleCheckBig,
  Star, MessageSquareText, Ban, Flag,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

interface ProposalChatCardProps {
  dealId: string;
  brandId: string;
  creatorId: string;
}

function parseMeta(deal: any) {
  try {
    const parsed = JSON.parse(deal.description || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function updateMeta(deal: any, updates: Record<string, string>) {
  const meta = parseMeta(deal);
  const message = meta.message || deal.description || "";
  const merged = { ...meta, ...updates };
  if (!merged.message) merged.message = message;
  return JSON.stringify(merged);
}

function statusLabel(t: any, deal: any) {
  const labels: Record<string, string> = {
    pending: t("trust.dealStatusPending"),
    confirmed: t("trust.dealStatusConfirmed"),
    first_payment: t("trust.firstPaymentConfirmed"),
    work_submitted: t("trust.workSubmitted"),
    completed: t("trust.dealStatusCompleted"),
    final_payment: t("trust.finalPaymentDone"),
    dispute: t("trust.dealStatusDispute"),
    rejected: t("trust.proposalRejected"),
  };
  return labels[deal.status] || deal.status;
}

export function ProposalChatCard({ dealId, brandId, creatorId }: ProposalChatCardProps) {
  const { t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [sendingReview, setSendingReview] = useState(false);
  const [deadlineDays, setDeadlineDays] = useState<number | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const hasSentDeadlineNotif = useRef(false);

  const { data: deal } = useQuery({
    queryKey: ["chat-deal", dealId],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("*").eq("id", dealId).single();
      return data;
    },
    refetchInterval: 3000,
  });

  const { data: existingReview } = useQuery({
    queryKey: ["deal-review", dealId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      let data = await supabase
        .from("creator_reviews")
        .select("id, rating, comment, reviewer_id")
        .eq("deal_id", dealId)
        .eq("reviewer_id", user.id)
        .maybeSingle();
      if (data.data) return data.data;
      data = await supabase
        .from("brand_reviews")
        .select("id, rating, comment, reviewer_id")
        .eq("deal_id", dealId)
        .eq("reviewer_id", user.id)
        .maybeSingle();
      return data.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!deal?.deadline) return;
    function calc() {
      const diff = new Date(deal.deadline).getTime() - Date.now();
      setDeadlineDays(Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [deal?.deadline]);

  useEffect(() => {
    if (!deal || !user || hasSentDeadlineNotif.current) return;
    const s = deal.status;
    const isActive = !["dispute", "rejected", "completed", "final_payment"].includes(s);
    if (!isActive || !deal.deadline) return;
    const diff = new Date(deal.deadline).getTime() - Date.now();
    const daysUntilDeadline = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 2 && daysUntilDeadline >= 0 && user.id === creatorId && (s === "confirmed" || s === "first_payment" || s === "work_submitted" || s === "final_payment")) {
      hasSentDeadlineNotif.current = true;
      createNotification({
        userId: creatorId, type: "deal_review_required",
        title: t("trust.notifDeadlineReminderTitle"),
        body: t("trust.notifDeadlineReminderBody"),
        link: `/brand?page=messages&chat=${brandId}`,
      });
    }
  }, [deal?.id, deal?.status, deal?.deadline, user?.id]);

  if (!deal) return null;

  const isBrand = user?.id === brandId;
  const isCreator = user?.id === creatorId;
  const meta = parseMeta(deal);
  const s = deal.status;
  const isPending = s === "pending";
  const isConfirmed = s === "confirmed";
  const isFirstPayment = s === "first_payment";
  const isWorkSubmitted = s === "work_submitted";
  const isCompleted = s === "completed";
  const isFinalPayment = s === "final_payment";
  const isDispute = s === "dispute";
  const isRejected = s === "rejected";
  const isActive = !isDispute && !isRejected && !isCompleted && !isPending;
  const canReview = isCompleted && !existingReview && user;

  const workSubmittedAt = meta.workSubmittedAt ? new Date(meta.workSubmittedAt) : null;
  const canCreatorDispute = isWorkSubmitted && workSubmittedAt &&
    (Date.now() - workSubmittedAt.getTime() > 7 * 24 * 60 * 60 * 1000);

  async function updateStatus(newStatus: string, metaUpdates?: Record<string, string>) {
    const payload: any = { status: newStatus };
    if (metaUpdates) {
      payload.description = updateMeta(deal, metaUpdates);
    }
    await supabase.from("deals").update(payload).eq("id", dealId);
    qc.invalidateQueries({ queryKey: ["chat-deal", dealId] });
  }

  async function handleAccept() {
    if (!user) return;
    await updateStatus("confirmed");
    toast.success(t("trust.dealAccepted"));
    createNotification({
      userId: brandId, type: "deal_confirmed",
      title: t("trust.notifDealConfirmedTitle"), body: t("trust.notifDealConfirmedBody"),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
  }

  async function handleReject() {
    if (!user) return;
    await updateStatus("rejected");
    toast.success(t("trust.dealRejected"));
    createNotification({
      userId: brandId, type: "deal_rejected",
      title: t("trust.notifDealRejectedTitle"), body: t("trust.notifDealRejectedBody", { title: deal.title }),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
  }

  async function handleFirstPayment() {
    if (!user) return;
    await updateStatus("first_payment", { firstPaymentAt: new Date().toISOString() });
    toast.success(t("trust.firstPaymentDone"));
    createNotification({
      userId: creatorId, type: "first_payment_confirmed",
      title: t("trust.notifFirstPaymentTitle"), body: t("trust.notifFirstPaymentBody"),
      link: `/brand?page=messages&chat=${brandId}`,
    });
  }

  async function handleSubmitWork() {
    if (!user) return;
    await updateStatus("work_submitted", { workSubmittedAt: new Date().toISOString() });
    toast.success(t("trust.workSentForReview"));
    createNotification({
      userId: brandId, type: "work_submitted",
      title: t("trust.notifWorkSubmittedTitle"), body: t("trust.notifWorkSubmittedBody"),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
    createNotification({
      userId: brandId, type: "deal_review_required",
      title: t("trust.notifReviewWorkTitle"), body: t("trust.notifReviewWorkBody"),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
  }

  async function handleComplete() {
    if (!user) return;
    await updateStatus("final_payment", { finalPaymentAt: new Date().toISOString() });
    toast.success(t("trust.workConfirmed"));
    createNotification({
      userId: creatorId, type: "work_confirmed",
      title: t("trust.notifWorkConfirmedTitle"), body: t("trust.notifWorkConfirmedBody"),
      link: `/brand?page=messages&chat=${brandId}`,
    });
  }

  async function handleFinalPayment() {
    if (!user) return;
    await updateStatus("completed", { completedAt: new Date().toISOString() });
    toast.success(t("trust.cooperationCompleted"));
    createNotification({
      userId: creatorId, type: "deal_completed",
      title: t("trust.notifDealCompletedTitle"), body: t("trust.notifDealCompletedBody"),
      link: `/brand?page=messages&chat=${brandId}`,
    });
    createNotification({
      userId: creatorId, type: "deal_review_required",
      title: t("trust.notifReviewCreatorTitle"), body: t("trust.notifReviewCreatorBody"),
      link: `/brand?page=messages&chat=${brandId}`,
    });
    createNotification({
      userId: brandId, type: "deal_review_required",
      title: t("trust.notifReviewBrandTitle"), body: t("trust.notifReviewBrandBody"),
      link: `/brand?page=messages&chat=${creatorId}`,
    });
  }

  function openDisputeDialog() {
    setDisputeReason("");
    setDisputeDialogOpen(true);
  }

  async function handleConfirmDispute() {
    if (!user || !disputeReason.trim()) return;
    const payload: any = { status: "dispute", dispute_reason: disputeReason.trim(), dispute_opened_by: user.id };
    await supabase.from("deals").update(payload).eq("id", dealId);
    qc.invalidateQueries({ queryKey: ["chat-deal", dealId] });
    setDisputeDialogOpen(false);
    setDisputeReason("");
    const otherId = isBrand ? creatorId : brandId;
    createNotification({
      userId: otherId, type: "deal_disputed",
      title: t("trust.notifDealDisputedTitle"), body: t("trust.notifDealDisputedBody"),
      link: `/brand?page=messages&chat=${user.id}`,
    });
    toast.success(t("trust.dealDisputeOpened"));
  }

  async function handleSubmitReview() {
    if (!user || rating === 0) return;
    setSendingReview(true);
    let error;
    if (isBrand) {
      const res = await supabase.from("creator_reviews").insert({
        deal_id: dealId,
        creator_id: creatorId,
        reviewer_id: user.id,
        rating,
        comment: reviewComment || "",
        status: "completed",
      });
      error = res.error;
    } else {
      const res = await supabase.from("brand_reviews").insert({
        deal_id: dealId,
        brand_id: brandId,
        reviewer_id: user.id,
        rating,
        comment: reviewComment || "",
        status: "completed",
      });
      error = res.error;
    }
    setSendingReview(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.reviewSubmitted"));
    setRating(0);
    setReviewComment("");
    qc.invalidateQueries({ queryKey: ["deal-review", dealId, user.id] });
    qc.invalidateQueries({ queryKey: ["creator-public", creatorId] });
    qc.invalidateQueries({ queryKey: ["brand-public", brandId] });
  }

  const timeline: { label: string; time: Date | null }[] = [
    { label: t("trust.timelineProposalCreated"), time: deal.created_at ? new Date(deal.created_at) : null },
    { label: t("trust.timelineCreatorAccepted"), time: deal.updated_at && !isPending ? new Date(deal.updated_at) : null },
    { label: t("trust.timelineFirstPayment"), time: meta.firstPaymentAt ? new Date(meta.firstPaymentAt) : null },
    { label: t("trust.timelineWorkSubmitted"), time: meta.workSubmittedAt ? new Date(meta.workSubmittedAt) : null },
    { label: t("trust.timelineWorkConfirmed"), time: meta.finalPaymentAt ? new Date(meta.finalPaymentAt) : null },
    { label: t("trust.timelineCompleted"), time: meta.completedAt ? new Date(meta.completedAt) : null },
  ].filter((e) => e.time !== null || (e.label === t("trust.timelineProposalCreated") && deal.created_at));

  return (
    <div className="max-w-md space-y-3">
      {/* Deadline countdown — visible on active deals */}
      {deal.deadline && deadlineDays !== null && isActive && (
        <div className={`rounded-xl border p-3 text-xs font-medium ${
          deadlineDays <= 0 ? "border-red-300 bg-red-50 text-red-700" :
          deadlineDays <= 3 ? "border-amber-200 bg-amber-50 text-amber-700" :
          "border-green-200 bg-green-50 text-green-700"
        }`}>
          <Clock className="inline h-3.5 w-3.5 mr-1.5" />
          {deadlineDays <= 0 ? "🔴 " : deadlineDays <= 3 ? "🟡 " : "🟢 "}
          {deadlineDays <= 0
            ? t("trust.deadlineOverdue", { days: Math.abs(deadlineDays) })
            : t("trust.deadlineRemaining", { days: deadlineDays })
          }
        </div>
      )}

      {/* Safe deal banner */}
      {isActive && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent mb-1.5">
            <Shield className="h-3.5 w-3.5" /> {t("trust.safeDealTitle")}
          </div>
          <ol className="space-y-0.5 text-[11px] text-muted-foreground">
            <li>1. {t("trust.safeDealStep1")}</li>
            <li>2. {t("trust.safeDealStep2")}</li>
            <li>3. {t("trust.safeDealStep3")}</li>
            <li>4. {t("trust.safeDealStep4")}</li>
            <li>5. {t("trust.safeDealStep5")}</li>
            <li>6. {t("trust.safeDealStep6")}</li>
          </ol>
        </div>
      )}

      {/* Safe payment recommendation */}
      {(isConfirmed || isFirstPayment || isWorkSubmitted) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-1.5">
            <Shield className="h-3.5 w-3.5" /> {t("trust.safePaymentTitle")}
          </div>
          <p className="text-[11px] text-amber-700 mb-2">{t("trust.safePaymentDesc")}</p>
          <div className="space-y-1 text-[11px] text-amber-700">
            <p>💰 {t("trust.safePaymentHalf1")}</p>
            <p>💰 {t("trust.safePaymentHalf2")}</p>
          </div>
          <p className="mt-2 text-[10px] text-amber-500 italic">{t("trust.safePaymentNote")}</p>
          <p className="text-[10px] text-amber-500 italic">{t("trust.safePaymentDisclaimer")}</p>
        </div>
      )}

      {/* Main deal card */}
      <div className={`rounded-2xl border-2 p-4 ${
        isFinalPayment ? "border-green-300 bg-green-50" :
        isCompleted ? "border-green-300 bg-green-50" :
        isDispute ? "border-red-300 bg-red-50" :
        isRejected ? "border-muted bg-muted/20" :
        isWorkSubmitted ? "border-orange-200 bg-orange-50" :
        isConfirmed || isFirstPayment ? "border-blue-200 bg-blue-50" :
        "border-accent/30 bg-accent/5"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-sm font-semibold">{deal.title}</span>
          <span className="text-xs font-semibold whitespace-nowrap">{statusLabel(t, deal)}</span>
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

        {meta.message && (
          <p className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap border-t border-border/40 pt-3">
            {meta.message}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 space-y-2">
          {/* Creator: accept/reject on pending */}
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

          {/* Brand waiting */}
          {isBrand && isPending && (
            <p className="text-[11px] text-muted-foreground text-center">{t("trust.waitingCreator")}</p>
          )}

          {/* Brand: first payment confirmation */}
          {isBrand && isConfirmed && (
            <Button size="sm" className="w-full rounded-xl h-9 text-xs font-semibold" onClick={handleFirstPayment}>
              <DollarSign className="mr-1.5 h-3.5 w-3.5" /> {t("trust.confirmFirstPayment")}
            </Button>
          )}

          {/* Creator waiting after first payment */}
          {isCreator && isFirstPayment && (
            <p className="text-[11px] text-muted-foreground text-center">{t("trust.waitingWorkStart")}</p>
          )}

          {/* Creator: submit work */}
          {isCreator && (isConfirmed || isFirstPayment) && (
            <Button size="sm" className="w-full rounded-xl h-9 text-xs font-semibold" onClick={handleSubmitWork}>
              <SendHorizonal className="mr-1.5 h-3.5 w-3.5" /> {t("trust.submitWork")}
            </Button>
          )}

          {/* Brand: review work */}
          {isBrand && isWorkSubmitted && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 rounded-xl h-9 text-xs font-semibold bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> {t("trust.confirmWork")}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 rounded-xl h-9 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={openDisputeDialog}>
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> {t("trust.openDispute")}
              </Button>
            </div>
          )}

          {/* Creator waiting after work submitted */}
          {isCreator && isWorkSubmitted && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground text-center">{t("trust.waitingBrandReview")}</p>
              {canCreatorDispute && (
                <Button size="sm" variant="outline" className="w-full rounded-xl h-9 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={openDisputeDialog}>
                  <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> {t("trust.openDispute")}
                </Button>
              )}
            </div>
          )}

          {/* Creator waiting for final payment */}
          {isCreator && isFinalPayment && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground text-center">{t("trust.waitingFinalPayment")}</p>
            </div>
          )}

          {/* Brand: final payment after work confirmed */}
          {isBrand && isFinalPayment && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-800">
                <DollarSign className="h-4 w-4" /> {t("trust.finalPaymentTitle")}
              </div>
              <p className="text-[11px] text-indigo-700">{t("trust.finalPaymentDesc")}</p>
              <p className="text-[10px] text-indigo-500 italic">{t("trust.safePaymentDisclaimer")}</p>
              <Button size="sm" className="w-full rounded-xl h-9 text-xs font-semibold" onClick={handleFinalPayment}>
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> {t("trust.confirmFinalPaymentSent")}
              </Button>
            </div>
          )}

          {/* Brand: dispute before work submitted */}
          {isBrand && isFirstPayment && (
            <Button size="sm" variant="outline" className="w-full rounded-xl h-9 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={openDisputeDialog}>
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> {t("trust.openDispute")}
            </Button>
          )}

          {/* Completed state */}
          {isCompleted && (
            <div className="text-center space-y-2 py-2">
              <div className="text-xs font-medium text-green-600">
                <CircleCheckBig className="inline h-4 w-4 mr-1" />
                {t("trust.cooperationCompleted")}
              </div>
            </div>
          )}

          {/* Dispute state with admin review message */}
          {isDispute && (
            <div className="space-y-2">
              <div className="text-center text-xs font-medium text-red-600 py-1">
                {t("trust.dealDisputeOpened")}
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-[11px] text-red-700">
                <Ban className="inline h-3.5 w-3.5 mr-1.5" />
                {t("trust.disputeAdminReview")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review prompt — after completed/final_payment, one time per user */}
      {canReview && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-800">
            <Star className="h-4 w-4" /> {t("trust.reviewPromptTitle")}
          </div>
          <p className="text-[11px] text-green-700">{t("trust.reviewPromptDesc")}</p>
          {/* Star rating */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-colors"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star === rating ? 0 : star)}
              >
                <Star
                  className={`h-6 w-6 ${
                    star <= (hoverRating || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {/* Optional comment */}
          <Textarea
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder={t("trust.reviewCommentPlaceholder")}
            className="min-h-[60px] text-xs rounded-xl border-green-200"
            rows={2}
          />
          <Button
            size="sm"
            className="w-full rounded-xl h-9 text-xs font-semibold"
            disabled={rating === 0 || sendingReview}
            onClick={handleSubmitReview}
          >
            {sendingReview ? t("common.loading") : t("trust.reviewSubmit")}
          </Button>
        </div>
      )}

      {/* Show existing review */}
      {existingReview && isCompleted && (
        <div className="rounded-xl border border-green-100 bg-green-50/30 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-700 mb-1">
            <MessageSquareText className="h-3.5 w-3.5" /> {t("trust.yourReview")}
          </div>
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`h-3.5 w-3.5 ${
                star <= (existingReview.rating || 0)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/20"
              }`} />
            ))}
          </div>
          {existingReview.comment && (
            <p className="text-[11px] text-muted-foreground">{existingReview.comment}</p>
          )}
        </div>
      )}

      {/* Dispute reason dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("trust.openDispute")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("trust.disputeReasonPrompt")}</p>
            <div className="space-y-2">
              <Label>{t("admin.disputeReason")}</Label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={t("trust.disputeReasonPlaceholder") || "Describe the reason for the dispute..."}
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDisputeDialogOpen(false)}>
                {t("admin.cancel")}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!disputeReason.trim()}
                onClick={handleConfirmDispute}
              >
                <Flag className="mr-1.5 h-4 w-4" />
                {t("trust.sendDispute")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timeline */}
      {isActive || isCompleted || isDispute ? (
        <div className="rounded-xl border border-border/40 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
            <Clock className="h-3.5 w-3.5" /> {t("trust.timeline")}
          </div>
          <div className="space-y-1.5">
            {timeline.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  item.time ? "bg-accent" : "bg-muted"
                }`} />
                <span className={item.time ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
                {item.time && (
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {item.time.toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
