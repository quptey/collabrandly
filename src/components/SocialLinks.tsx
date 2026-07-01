import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  TelegramIcon,
  XIcon,
  FacebookIcon,
  LinkedInIcon,
} from "@/components/social-icons";
import { SOCIAL_PLATFORM_COLUMNS, SOCIAL_PLATFORMS_DATA } from "@/lib/constants";
import { Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ProfileRecord = Record<string, unknown>;

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  telegram: TelegramIcon,
  x: XIcon,
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
};

const PLATFORM_LABELS: Record<string, string> = {};
for (const p of SOCIAL_PLATFORMS_DATA) {
  PLATFORM_LABELS[p.value] = p.label;
}

export function SocialLinks({ profile }: { profile: ProfileRecord }) {
  const links: { platform: string; url: string; label: string }[] = [];

  for (const [platform, column] of Object.entries(SOCIAL_PLATFORM_COLUMNS)) {
    const val = profile[column];
    if (typeof val === "string" && val.trim()) {
      links.push({
        platform,
        url: val.trim(),
        label: PLATFORM_LABELS[platform] ?? platform,
      });
    }
  }

  if (links.length === 0) return null;

  const isSingle = links.length === 1;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {links.map((link) => {
          const Icon = PLATFORM_ICONS[link.platform] || Globe;
          return (
            <Tooltip key={link.platform}>
              <TooltipTrigger asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center transition-all duration-150 hover:scale-105 hover:shadow-sm hover:cursor-pointer"
                  style={{ width: 18, height: 18 }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="rounded-xl border-border/40 bg-white px-3 py-1.5 text-xs shadow-md"
              >
                Open {link.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
