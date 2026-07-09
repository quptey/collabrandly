import { useT } from "@/i18n";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Handshake } from "lucide-react";

interface DealCardProps {
  creatorId: string;
  creatorName: string;
}

export function DealCard({ creatorId }: DealCardProps) {
  const { t } = useT();
  const navigate = useNavigate();

  return (
    <Button
      className="w-full rounded-2xl h-12 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
      onClick={() => navigate({ to: `/creator/${creatorId}` })}
    >
      <Handshake className="mr-2 h-5 w-5" />
      {t("trust.proposeCollaboration")}
    </Button>
  );
}
