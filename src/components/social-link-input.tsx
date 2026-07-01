import { useRef, useState, useEffect, useCallback } from "react";
import { SOCIAL_PLATFORM_PREFIXES, SOCIAL_PLATFORMS_DATA } from "@/lib/constants";
import { extractUsername, buildFullUrl } from "@/lib/constants";
import { Globe } from "lucide-react";

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  instagram: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white",
  tiktok: "bg-black text-white",
  youtube: "bg-[#FF0000] text-white",
  telegram: "bg-[#0088CC] text-white",
  x: "bg-black text-white",
  facebook: "bg-[#1877F2] text-white",
  linkedin: "bg-[#0A66C2] text-white",
  website: "bg-muted text-muted-foreground",
};

const PLATFORM_BADGE_ICONS: Record<string, string> = {
  instagram: "In",
  tiktok: "Tk",
  youtube: "YT",
  telegram: "Tg",
  x: "X",
  facebook: "Fb",
  linkedin: "Li",
};

const INVALID_CHARS_REGEX = /[^a-zA-Z0-9_.@-]/g;

const PLATFORM_VALID_CHARS: Record<string, RegExp> = {
  instagram: /^[a-zA-Z0-9._]+$/,
  tiktok: /^[a-zA-Z0-9._]+$/,
  youtube: /^[a-zA-Z0-9._-]+$/,
  telegram: /^[a-zA-Z0-9_]+$/,
  x: /^[a-zA-Z0-9_]+$/,
  facebook: /^[a-zA-Z0-9.]+$/,
  linkedin: /^[a-zA-Z0-9-]+$/,
};

const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  instagram: "your_username",
  tiktok: "creators_name",
  youtube: "channel_name",
  telegram: "username",
  x: "username",
  facebook: "username",
  linkedin: "your-name",
};

export function SocialLinkInput({
  platform,
  value,
  onChange,
  onRemove,
}: {
  platform: string;
  value: string;
  onChange: (url: string) => void;
  onRemove: () => void;
}) {
  const prefix = SOCIAL_PLATFORM_PREFIXES[platform];
  const pf = SOCIAL_PLATFORMS_DATA.find((p) => p.value === platform);
  const label = pf?.label ?? platform;
  const badgeColor = PLATFORM_BADGE_COLORS[platform] ?? "bg-muted text-muted-foreground";
  const badgeIcon = PLATFORM_BADGE_ICONS[platform] ?? label.slice(0, 2);
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(() => extractUsername(platform, value));

  useEffect(() => {
    setUsername(extractUsername(platform, value));
  }, [value, platform]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      raw = raw.replace(INVALID_CHARS_REGEX, "");
      const full = buildFullUrl(platform, raw);
      setUsername(raw);
      onChange(full);
    },
    [platform, onChange],
  );

  if (!prefix) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${badgeColor}`}
        >
          {label === "Website" ? <Globe className="h-3.5 w-3.5" /> : badgeIcon}
        </span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${badgeColor}`}
      >
        {badgeIcon}
      </span>
      <div className="relative flex flex-1 items-center overflow-hidden rounded-xl border border-border bg-white focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
        <span className="pointer-events-none shrink-0 whitespace-nowrap border-r border-border/40 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground/60 font-mono max-w-[120px] overflow-hidden text-ellipsis">
          {prefix}
        </span>
        <input
          ref={inputRef}
          value={username}
          onChange={handleChange}
          placeholder={PLATFORM_PLACEHOLDERS[platform] ?? "username"}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  );
}
