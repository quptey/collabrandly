import { useT } from "@/i18n";

interface CollectionCardProps {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  productCount: number;
  onClick?: () => void;
}

export function CollectionCard({ title, description, coverUrl, productCount, onClick }: CollectionCardProps) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full overflow-hidden rounded-3xl border border-border bg-card text-left hover-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-warm">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-warm via-cream to-secondary p-6 text-center">
            <span className="font-display text-3xl font-medium text-foreground/40">{title}</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 rounded-full bg-background/95 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
          {productCount} {productCount === 1 ? t("collection.piece") : t("collection.pieces")}
        </div>
      </div>
      <div className="space-y-1.5 p-5">
        <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight">{title}</h3>
        {description && <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>}
      </div>
    </button>
  );
}