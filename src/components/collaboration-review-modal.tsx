import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useT } from "@/i18n";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborationId: string;
  targetId: string;
  targetType: "creator" | "brand";
  reviewerId: string;
  targetName: string;
  invalidateKey: string[];
}

export function CollaborationReviewModal({
  open,
  onOpenChange,
  collaborationId,
  targetId,
  targetType,
  reviewerId,
  targetName,
  invalidateKey,
}: ReviewModalProps) {
  const { t } = useT();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setRating(0);
    setHoverRating(0);
    setComment("");
    setSending(false);
    setSubmitted(false);
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setSending(true);

    const table = targetType === "creator" ? "creator_reviews" : "brand_reviews";
    const targetColumn = targetType === "creator" ? "creator_id" : "brand_id";
    const payload: Record<string, any> = {
      [targetColumn]: targetId,
      reviewer_id: reviewerId,
      collaboration_id: collaborationId,
      rating,
      comment: comment || "",
      status: "completed",
      moderation_status: "approved",
    };

    const { error } = await supabase.from(table).insert(payload);
    setSending(false);

    if (error) {
      if (error.code === "23505") {
        toast.error(t("trust.reviewAlreadyExists") || "You have already reviewed this collaboration");
      } else {
        toast.error(error.message);
      }
      return;
    }

    setSubmitted(true);
    toast.success(t("trust.reviewSubmitted"));
    qc.invalidateQueries({ queryKey: invalidateKey });
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <Star className="h-7 w-7 text-success fill-success" />
            </div>
            <DialogTitle className="font-display text-xl">
              {t("trust.reviewThankYou") || "Thank you for your review!"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t("trust.reviewThankYouDesc") || "Your review is now visible on the public profile."}
            </p>
            <Button variant="outline" onClick={handleClose} className="rounded-xl">
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                {t("trust.reviewPromptTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("trust.reviewPromptDesc")} — <span className="font-medium text-foreground">{targetName}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform hover:scale-110"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star === rating ? 0 : star)}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/20"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("trust.reviewCommentPlaceholder")}
                className="min-h-[80px] text-sm rounded-xl"
                rows={3}
              />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>
                  {t("admin.cancel")}
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  disabled={rating === 0 || sending}
                  onClick={handleSubmit}
                >
                  {sending ? t("common.loading") : t("trust.reviewSubmit")}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
