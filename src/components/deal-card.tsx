import { useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProposalModal } from "@/components/proposal-modal";
import { useNavigate } from "@tanstack/react-router";
import { Handshake } from "lucide-react";

interface DealCardProps {
  creatorId: string;
  creatorName: string;
}

export function DealCard({ creatorId, creatorName }: DealCardProps) {
  const { t } = useT();
  const { user, isBrand } = useAuth();
  const navigate = useNavigate();
  const [proposalOpen, setProposalOpen] = useState(false);

  const { data: existingDeal } = useQuery({
    queryKey: ["deal-with-creator", user?.id, creatorId],
    enabled: !!user && isBrand,
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, status")
        .eq("brand_id", user!.id)
        .eq("creator_id", creatorId)
        .neq("status", "rejected")
        .maybeSingle();
      return data;
    },
  });

  if (!user || !isBrand) return null;

  if (existingDeal) {
    return (
      <Button
        className="w-full rounded-2xl h-11"
        variant="outline"
        onClick={() => navigate({ to: `/deal/${existingDeal.id}` })}
      >
        <Handshake className="mr-2 h-4 w-4" />
        {t("trust.goToDeal")}
      </Button>
    );
  }

  return (
    <>
      <Button
        className="w-full rounded-2xl h-12 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
        onClick={() => setProposalOpen(true)}
      >
        <Handshake className="mr-2 h-5 w-5" />
        {t("trust.proposeCollaboration")}
      </Button>
      <ProposalModal
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        creatorId={creatorId}
        creatorName={creatorName}
      />
    </>
  );
}
