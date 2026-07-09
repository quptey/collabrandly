import { useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreatorReputationProps {
  creatorId: string;
  completedDeals: number;
  complaintsCount: number;
}

export function CreatorReputation({ creatorId, completedDeals, complaintsCount }: CreatorReputationProps) {
  const { t } = useT();
  const { user, isBrand } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"completed" | "failed" | null>(null);
  const [complaint, setComplaint] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!user || !reviewStatus) return;
    setSending(true);
    const { error } = await supabase.from("creator_reviews").insert({
      creator_id: creatorId,
      reviewer_id: user.id,
      status: reviewStatus,
      complaint: reviewStatus === "failed" ? complaint || "" : "",
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.reviewSubmitted"));
    trackEvent("review_submitted", { creatorId, status: reviewStatus, hasComplaint: reviewStatus === "failed" ? !!complaint : false });
    if (reviewStatus === "failed" && complaint) {
      trackEvent("complaint_filed", { creatorId, complaintLength: complaint.length });
    }
    setOpen(false);
    setReviewStatus(null);
    setComplaint("");
    qc.invalidateQueries({ queryKey: ["creators", "marketplace"] });
    qc.invalidateQueries({ queryKey: ["creator-public", creatorId] });
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-green-600 font-medium">
        {t(completedDeals === 1 ? "trust.completedDeal" : "trust.completedDeals", { count: completedDeals })}
      </span>
      {complaintsCount > 0 && (
        <span className="text-amber-600 font-medium">
          {t("trust.complaints", { count: complaintsCount })}
        </span>
      )}
      {isBrand && (
        <>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {t("trust.rateCollaboration")}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{t("trust.rateCollaboration")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Button
                    variant={reviewStatus === "completed" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setReviewStatus("completed")}
                  >
                    {t("trust.completed")}
                  </Button>
                  <Button
                    variant={reviewStatus === "failed" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setReviewStatus("failed")}
                  >
                    {t("trust.notCompleted")}
                  </Button>
                </div>
                {reviewStatus === "failed" && (
                  <Textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder={t("trust.problemPlaceholder")}
                    rows={3}
                  />
                )}
                <Button
                  className="w-full"
                  disabled={!reviewStatus || sending}
                  onClick={handleSubmit}
                >
                  {sending ? t("common.loading") : t("common.send")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
