import { useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DealCardProps {
  creatorId: string;
  creatorName: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border border-blue-200",
  completed: "bg-green-100 text-green-800 border border-green-200",
  dispute: "bg-red-100 text-red-800 border border-red-200",
};

export function DealCard({ creatorId, creatorName }: DealCardProps) {
  const { t } = useT();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", user?.id, creatorId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*")
        .or(`brand_id.eq.${user!.id},creator_id.eq.${user!.id}`)
        .or(`and(brand_id.eq.${creatorId},creator_id.eq.${creatorId})`)
        .maybeSingle();
      return data;
    },
  });

  async function createDeal() {
    if (!user || !amount) return;
    setCreating(true);
    const { error } = await supabase.from("deals").insert({
      brand_id: user.id,
      creator_id: creatorId,
      amount,
      description,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealCreated"));
    trackEvent("deal_created", { creatorId, amount });
    createNotification({
      userId: creatorId,
      type: "deal_created",
      title: t("trust.notifDealCreatedTitle"),
      body: t("trust.notifDealCreatedBody", { amount }),
      link: `/creator/${user.id}`,
    });
    setOpen(false);
    setAmount("");
    setDescription("");
    setDeadline("");
    qc.invalidateQueries({ queryKey: ["deal", user.id, creatorId] });
  }

  async function confirmDeal() {
    if (!user || !deal) return;
    const isBrand = deal.brand_id === user.id;
    const update = isBrand
      ? { brand_confirmed: true }
      : { creator_confirmed: true };
    const { error } = await supabase
      .from("deals")
      .update({ ...update })
      .eq("id", deal.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealConfirmed"));
    trackEvent("deal_confirmed", { dealId: deal.id });
    const otherPartyId = isBrand ? deal.creator_id : deal.brand_id;
    createNotification({
      userId: otherPartyId,
      type: "deal_confirmed",
      title: t("trust.notifDealConfirmedTitle"),
      body: t("trust.notifDealConfirmedBody"),
      link: `/creator/${user.id}`,
    });
    qc.invalidateQueries({ queryKey: ["deal", user.id, creatorId] });
  }

  async function markCompleted() {
    if (!user || !deal) return;
    if (deal.brand_id !== user.id) return;
    const { error } = await supabase
      .from("deals")
      .update({ status: "completed" })
      .eq("id", deal.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealCompleted"));
    trackEvent("deal_completed", { dealId: deal.id });
    createNotification({
      userId: deal.creator_id,
      type: "deal_completed",
      title: t("trust.notifDealCompletedTitle"),
      body: t("trust.notifDealCompletedBody"),
      link: `/brand`,
    });
    qc.invalidateQueries({ queryKey: ["deal", user.id, creatorId] });
  }

  async function openDispute() {
    if (!user || !deal) return;
    const reason = window.prompt(t("trust.disputeReasonPrompt") || "Why are you opening a dispute?");
    if (reason === null) return;
    const { error } = await supabase
      .from("deals")
      .update({ status: "dispute", dispute_reason: reason })
      .eq("id", deal.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.dealDisputeOpened"));
    trackEvent("deal_disputed", { dealId: deal.id, reason });
    const disputeNotifyId = user.id === deal.brand_id ? deal.creator_id : deal.brand_id;
    createNotification({
      userId: disputeNotifyId,
      type: "deal_disputed",
      title: t("trust.notifDealDisputedTitle"),
      body: t("trust.notifDealDisputedBody"),
      link: `/creator/${user.id}`,
    });
    qc.invalidateQueries({ queryKey: ["deal", user.id, creatorId] });
  }

  if (isLoading) return null;

  if (!deal) {
    if (!user) return null;
    return user.id !== creatorId ? (
      <>
        <Button variant="outline" className="rounded-2xl h-11" onClick={() => setOpen(true)}>
          {t("trust.dealCreateNew")}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {t("trust.dealTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("trust.dealAmountPlaceholder")}
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("trust.dealDescriptionPlaceholder")}
                rows={3}
              />
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder={t("trust.dealDeadline")}
              />
              <Button className="w-full" disabled={!amount || creating} onClick={createDeal}>
                {creating ? t("common.loading") : t("trust.dealCreateNew")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    ) : null;
  }

  const isBrand = deal.brand_id === user?.id;
  const myConfirmed = isBrand ? deal.brand_confirmed : deal.creator_confirmed;
  const otherConfirmed = isBrand ? deal.creator_confirmed : deal.brand_confirmed;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold">{t("trust.dealTitle")}</span>
        <Badge className={statusColors[deal.status] || statusColors.pending}>
          {t(`trust.dealStatus${deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}`)}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>{t("trust.dealAmount")}: {deal.amount}</p>
        {deal.description && <p>{t("trust.dealDescription")}: {deal.description}</p>}
        {deal.deadline && <p>{t("trust.dealDeadline")}: {new Date(deal.deadline).toLocaleDateString()}</p>}
      </div>
      {deal.status === "pending" && !myConfirmed && (
        <Button size="sm" className="w-full rounded-xl" onClick={confirmDeal}>
          {t("trust.dealConfirm")}
        </Button>
      )}
      {deal.status === "pending" && myConfirmed && !otherConfirmed && (
        <p className="text-xs text-muted-foreground text-center">{t("trust.dealStatusPending")}</p>
      )}
      {deal.status === "confirmed" && isBrand && (
        <Button size="sm" className="w-full rounded-xl" onClick={markCompleted}>
          {t("trust.dealMarkCompleted")}
        </Button>
      )}
      {deal.status !== "completed" && deal.status !== "dispute" && myConfirmed && otherConfirmed && (
        <Button size="sm" variant="outline" className="w-full rounded-xl" onClick={openDispute}>
          {t("trust.dealOpenDispute")}
        </Button>
      )}
    </div>
  );
}
