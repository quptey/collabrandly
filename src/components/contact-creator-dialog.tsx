import { useT } from "@/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUDGET_RANGES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brandRequestSchema } from "@/lib/validation";

export function ContactCreatorDialog({
  open, onOpenChange, creatorId, creatorName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  creatorId: string;
  creatorName: string;
}) {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();

  const form = useForm({ resolver: zodResolver(brandRequestSchema) });
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = form;

  async function submit(data: {
    brand_name: string;
    contact_person: string;
    email: string;
    campaign_name: string;
    budget_range: string;
    description?: string;
    deadline?: string;
    message?: string;
  }) {
    if (!user) {
      onOpenChange(false);
      navigate({ to: "/auth", search: { mode: "signin" } });
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("verification_status").eq("id", user.id).single();
    if (profile && profile.verification_status === "pending") {
      toast.error(t("contact.pendingVerification"));
      return;
    }
    if (profile && profile.verification_status === "rejected") {
      toast.error(t("contact.rejectedVerification"));
      return;
    }

    const { error } = await supabase.from("brand_requests").insert({
      creator_id: creatorId,
      sender_id: user.id,
      brand_name: data.brand_name,
      contact_person: data.contact_person,
      budget_range: data.budget_range,
      goal: JSON.stringify({
        campaignName: data.campaign_name,
        description: data.description || "",
        email: data.email,
        deadline: data.deadline || "",
      }),
      message: data.message || "",
    });
    if (error) { toast.error(error.message); return; }
    // Notify creator
    await supabase.from("notifications").insert({
      user_id: creatorId,
      title: t("contact.notifTitle"),
      body: t("contact.notifBody", { brand: data.brand_name }),
      type: "collaboration_request",
      link: "/creator",
    });
    toast.success(t("contact.sent"));
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("contact.title", { name: creatorName })}</DialogTitle>
          <DialogDescription>{t("contact.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand">{t("contact.brand")}</Label>
              <Input id="brand" {...register("brand_name")} />
              {errors.brand_name && <p className="text-xs text-destructive">{errors.brand_name.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact">{t("contact.contactPerson")}</Label>
              <Input id="contact" {...register("contact_person")} />
              {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person.message as string}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.businessEmail")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign">{t("contact.goal")}</Label>
            <Input id="campaign" {...register("campaign_name")} />
            {errors.campaign_name && <p className="text-xs text-destructive">{errors.campaign_name.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">{t("contact.goal")} {t("contact.message")}</Label>
            <Textarea id="desc" rows={3} {...register("description")} placeholder={t("contact.goalPlaceholder")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("contact.budget")}</Label>
              <Select value={watch("budget_range")} onValueChange={(v) => setValue("budget_range", v)}>
                <SelectTrigger><SelectValue placeholder={t("contact.pickRange")} /></SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.budget_range && <p className="text-xs text-destructive">{errors.budget_range.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">{t("auth.deadline")}</Label>
              <Input id="deadline" type="date" {...register("deadline")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">{t("contact.message")}</Label>
            <Textarea id="message" rows={4} {...register("message")} placeholder={t("contact.goalPlaceholder")} />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t("contact.sending") : t("contact.send")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
