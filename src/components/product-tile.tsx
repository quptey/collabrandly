import { ExternalLink } from "lucide-react";
import { useT } from "@/i18n";

interface ProductTileProps {
  name: string;
  imageUrl?: string | null;
  externalLink?: string | null;
}

export function ProductTile({ name, imageUrl, externalLink }: ProductTileProps) {
  const { t } = useT();
  const content = (
    <>
      <div className="aspect-[9/19.5] overflow-hidden rounded-2xl bg-warm">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            {t("creatorProfile.noImage")}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{name}</p>
        {externalLink && (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
        )}
      </div>
    </>
  );

  if (externalLink) {
    return (
      <a href={externalLink} target="_blank" rel="noopener noreferrer" className="group block">
        {content}
      </a>
    );
  }
  return <div className="group block">{content}</div>;
}
