import { useState } from "react";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircleHeart } from "lucide-react";
import { toast } from "sonner";

export function FeedbackButton() {
  const { t } = useT();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [likes, setLikes] = useState("");
  const [confusing, setConfusing] = useState("");
  const [changes, setChanges] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      likes,
      confusing,
      changes,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("feedback.thanks"));
    setOpen(false);
    setLikes("");
    setConfusing("");
    setChanges("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:bg-accent/90 transition-all hover:scale-105"
      >
        <MessageCircleHeart className="h-4 w-4" />
        {t("feedback.button")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t("feedback.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("feedback.subtitle")}</p>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("feedback.likesLabel")}
              </label>
              <Textarea
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder={t("feedback.likesPlaceholder")}
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("feedback.confusingLabel")}
              </label>
              <Textarea
                value={confusing}
                onChange={(e) => setConfusing(e.target.value)}
                placeholder={t("feedback.confusingPlaceholder")}
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("feedback.changesLabel")}
              </label>
              <Textarea
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
                placeholder={t("feedback.changesPlaceholder")}
                rows={2}
              />
            </div>
            <Button
              className="w-full rounded-2xl h-12"
              disabled={sending || (!likes && !confusing && !changes)}
              onClick={handleSubmit}
            >
              {sending ? t("common.loading") : t("feedback.send")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
