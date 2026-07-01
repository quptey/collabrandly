import { useT } from "@/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const REPORT_REASONS = [
  "reasonScam",
  "reasonFakeCompany",
  "reasonFakeCreator",
  "reasonSpam",
  "reasonOffensive",
  "reasonInappropriate",
  "reasonOther",
] as const;

export function ReportDialog({
  open,
  onOpenChange,
  reportedId,
  userType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reportedId: string;
  userType: "creator" | "brand";
}) {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!user) {
      onOpenChange(false);
      navigate({ to: "/auth" });
      return;
    }
    if (!reason) return;
    setSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: reportedId,
      user_type: userType,
      reason,
      description,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("report.sent"));
    onOpenChange(false);
    setReason("");
    setDescription("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("report.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("report.reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("report.reasonPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`report.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("report.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("report.descriptionPlaceholder")}
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t("report.cancel")}
            </Button>
            <Button className="flex-1" disabled={!reason || sending} onClick={submit}>
              {sending ? t("common.loading") : t("report.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
