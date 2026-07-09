import { useT } from "@/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AudienceIndicatorProps {
  quality: "green" | "yellow" | "red" | null | undefined;
}

const dotColors: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const toolTexts: Record<string, string> = {
  green: "trust.audienceGreen",
  yellow: "trust.audienceYellow",
  red: "trust.audienceRed",
};

export function AudienceIndicator({ quality }: AudienceIndicatorProps) {
  const { t } = useT();

  if (!quality) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotColors[quality]}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{t(toolTexts[quality])}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}