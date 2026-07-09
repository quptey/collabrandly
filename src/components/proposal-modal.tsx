import { useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

interface ProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creatorId: string;
  creatorName: string;
}

export function ProposalModal({ open, onOpenChange, creatorId, creatorName }: ProposalModalProps) {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSubmit() {
    if (!user || !title || !amount) return;
    setCreating(true);
    const { data: deal, error } = await supabase
      .from("deals")
      .insert({
        brand_id: user.id,
        creator_id: creatorId,
        title,
        amount,
        description: message,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        brand_confirmed: true,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error || !deal) {
      toast.error(error?.message ?? "Error");
      return;
    }
    toast.success(t("trust.proposalSent"));
    trackEvent("deal_created", { creatorId, amount, title });
    createNotification({
      userId: creatorId,
      type: "deal_created",
      title: t("trust.notifProposalTitle"),
      body: t("trust.notifProposalBody", { title, amount }),
      link: `/deal/${deal.id}`,
    });
    onOpenChange(false);
    setTitle("");
    setAmount("");
    setDeadline("");
    setMessage("");
    navigate({ to: `/deal/${deal.id}` });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t("trust.proposalTitle", { name: creatorName })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("trust.proposalNameLabel")}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("trust.proposalNamePlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("trust.proposalBudgetLabel")}
            </label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("trust.proposalBudgetPlaceholder")}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("trust.proposalDeadlineLabel")}
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {t("trust.proposalMessageLabel")}
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("trust.proposalMessagePlaceholder")}
              rows={3}
            />
          </div>
          <Button
            className="w-full rounded-2xl h-12 text-base font-semibold"
            disabled={!title || !amount || creating}
            onClick={handleSubmit}
          >
            {creating ? t("common.loading") : t("trust.proposalSend")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
