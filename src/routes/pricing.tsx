import { createFileRoute, Link } from "@tanstack/react-router";
import { useT, t } from "@/i18n";
import { Check, Crown, Star, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: t("pricing.metaTitle") },
      { name: "description", content: t("pricing.metaDesc") },
    ],
  }),
  component: PricingPage,
});

const freeFeatureKeys = [
  "subscription.createProfile",
  "subscription.limitedCollections",
  "subscription.limitedProducts",
  "subscription.receiveRequests",
  "subscription.publicPage",
];

const proFeatureKeys = [
  "subscription.proUnlimited",
  "subscription.priorityRanking",
  "subscription.proBadge",
  "subscription.analytics",
  "subscription.creatorInsights",
  "subscription.featuredCreator",
];

const brandFeatureKeys = [
  "subscription.unlimitedSearch",
  "subscription.advancedFilters",
  "subscription.saveCreators",
  "subscription.unlimitedRequests",
  "subscription.campaignManagement",
  "subscription.creatorShortlist",
];

function PricingPage() {
  const { t } = useT();
  const { user } = useAuth();
  const { plan, isPro } = useSubscription();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("pricing.backToHome")}
        </Link>

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("landing.pricingEyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t("landing.pricingTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {/* Free Plan */}
          <div className="relative flex flex-col rounded-3xl border border-border bg-card p-8">
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-accent/10">
              <Star className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-accent">{t("subscription.free")}</p>
            <p className="mt-1 font-display text-4xl font-semibold">{t("subscription.freePrice")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("subscription.freeDesc")}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatureKeys.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {user && isPro ? (
                <Button disabled variant="outline" className="w-full rounded-full">{t("subscription.currentPlan")}</Button>
              ) : (
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button variant="outline" className="w-full rounded-full">{t("subscription.startFree")}</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Creator Pro - Most Popular */}
          <div className="relative flex flex-col rounded-3xl border-2 border-foreground bg-foreground p-8 text-background shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                <Sparkles className="h-3 w-3" /> {t("subscription.mostPopular")}
              </span>
            </div>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-background/10">
              <Crown className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-background/60">{t("subscription.creatorPro")}</p>
            <p className="mt-1 font-display text-4xl font-semibold">{t("subscription.proPrice")}</p>
            <p className="mt-1 text-sm text-background/70">{t("subscription.proDesc")}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {proFeatureKeys.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {user && isPro ? (
                <Button disabled variant="secondary" className="w-full rounded-full">{t("subscription.currentPlan")}</Button>
              ) : (
                <Link to="/auth" search={{ mode: "signup" }}>
                  <Button variant="secondary" className="w-full rounded-full">{t("subscription.upgradePro")}</Button>
                </Link>
              )}
            </div>
          </div>

          {/* Brand Plan */}
          <div className="relative flex flex-col rounded-3xl border border-border bg-card p-8">
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-xl bg-accent/10">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#92400E]">{t("subscription.brand")}</p>
            <p className="mt-1 font-display text-4xl font-semibold">{t("subscription.brandPrice")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("subscription.brandDesc")}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {brandFeatureKeys.map((k) => (
                <li key={k} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {user && plan?.key === "brand" ? (
                <Button disabled variant="outline" className="w-full rounded-full">{t("subscription.currentPlan")}</Button>
              ) : (
                <Link to="/auth" search={{ mode: "signup", role: "brand" }}>
                  <Button className="w-full rounded-full">{t("subscription.startBrand")}</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-card p-8 text-center">
          <h3 className="font-display text-2xl font-semibold">{t("subscription.needCustom")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t("subscription.needCustomDesc")}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => window.open("mailto:hello@creator-kz.kz")}>{t("subscription.contactSales")}</Button>
        </div>
      </div>
    </div>
  );
}
