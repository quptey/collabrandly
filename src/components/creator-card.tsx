import { Link } from "@tanstack/react-router";
import { useT } from "@/i18n";
import { getCategoryLabel } from "@/lib/constants";

interface CreatorCardProps {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  category?: string | null;
  customCategory?: string | null;
  city?: string | null;
  followerRange?: string | null;
}

export function CreatorCard({
  id,
  name,
  avatar,
  bio,
  category,
  customCategory,
  city,
  followerRange,
}: CreatorCardProps) {
  const { t } = useT();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      to="/creator/$id"
      params={{ id }}
      className="group block overflow-hidden rounded-3xl border border-border bg-card hover-lift"
    >
      <div className="aspect-[4/5] overflow-hidden bg-warm">
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-warm to-cream">
            <span className="font-display text-6xl font-semibold text-foreground/30">
              {initials || "·"}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-2 sm:space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg sm:text-xl font-semibold leading-tight tracking-tight">
            {name}
          </h3>
          {followerRange && (
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {followerRange}
            </span>
          )}
        </div>
        {bio && <p className="line-clamp-2 text-sm text-muted-foreground">{bio}</p>}
        <div className="flex items-center gap-2 pt-1 text-xs uppercase tracking-wider text-muted-foreground">
          {category && (
            <span className="font-medium text-accent">
              {getCategoryLabel(t, category, customCategory)}
            </span>
          )}
          {category && city && <span>·</span>}
          {city && <span>{city}</span>}
        </div>
      </div>
    </Link>
  );
}
