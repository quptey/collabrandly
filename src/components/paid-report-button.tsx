import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface PaidReportButtonProps {
  creatorId: string;
  creatorName: string;
}

export function PaidReportButton({ creatorId }: PaidReportButtonProps) {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleClick() {
    if (!user) {
      toast.error(t("creatorProfile.signInRequired"));
      navigate({ to: "/auth" });
      return;
    }
    const { error } = await supabase.from("report_requests").insert({
      brand_id: user.id,
      creator_id: creatorId,
      status: "clicked",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    trackEvent("report_clicked", { creatorId });
    navigate({ to: "/report/$id", params: { id: creatorId } });
  }

  return (
    <Button variant="accent" className="rounded-2xl h-11" onClick={handleClick}>
      {t("trust.getFullReport")}
    </Button>
  );
}
