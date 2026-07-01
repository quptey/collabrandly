import { useNavigate } from "@tanstack/react-router";
import { useT } from "@/i18n";
import { Crown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  type?: "collections" | "products" | "analytics";
}

const limitMessages: Record<string, { titleKey: string; descKey: string }> = {
  collections: { titleKey: "upgrade.collectionLimit", descKey: "upgrade.collectionLimitDesc" },
  products: { titleKey: "upgrade.productLimit", descKey: "upgrade.productLimitDesc" },
  analytics: { titleKey: "upgrade.analyticsLimit", descKey: "upgrade.analyticsLimitDesc" },
};

export function UpgradeModal({
  open,
  onOpenChange,
  title,
  description,
  type = "collections",
}: UpgradeModalProps) {
  const { t } = useT();
  const navigate = useNavigate();

  const msg = limitMessages[type];
  const displayTitle = title ?? t(msg.titleKey);
  const displayDesc = description ?? t(msg.descKey);

  const proFeatureKeys = [
    "upgrade.featureUnlimitedCollections",
    "upgrade.featureUnlimitedProducts",
    "upgrade.featurePrioritySearch",
    "upgrade.featureProBadge",
    "upgrade.featureProfileAnalytics",
    "upgrade.featureCreatorInsights",
    "upgrade.featureFeaturedCreator",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-accent/10">
            <Crown className="h-6 w-6 text-accent" />
          </div>
          <DialogTitle className="text-center font-display text-2xl">{displayTitle}</DialogTitle>
          <DialogDescription className="text-center">{displayDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("upgrade.proIncludes")}
          </p>
          {proFeatureKeys.map((k) => (
            <div key={k} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{t(k)}</span>
            </div>
          ))}
          <div className="pt-2 text-center">
            <p className="font-display text-2xl font-semibold">{t("upgrade.price")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full rounded-full"
            onClick={() => {
              onOpenChange(false);
              navigate({ to: "/pricing" });
            }}
          >
            {t("upgrade.upgradeButton")}
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t("upgrade.maybeLater")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
