import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useT, t } from "@/i18n";
import { motion } from "framer-motion";
import { Sparkles, Search, Send, Heart, BarChart3, Inbox, ArrowRight, Check, MapPin, Star, Eye, Users, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/constants";

const CATEGORY_ICONS: Record<string, string> = {
  beauty: "💄", fashion: "👗", fitness: "💪", food: "🍽️",
  lifestyle: "✨", tech: "💻", travel: "✈️", music: "🎵",
  art: "🎨", gaming: "🎮", education: "📚", business: "💼",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: t("landing.metaTitle") },
      { name: "description", content: t("landing.metaDesc") },
      { property: "og:title", content: t("landing.metaTitle") },
      { property: "og:description", content: t("landing.metaDesc") },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useT();

  const { data: featuredCreators = [] } = useQuery({
    queryKey: ["featured-creators"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, category, city, follower_range, bio")
        .eq("role", "creator")
        .in("verification_status", ["approved", "active"])
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  const { data: creatorCount = 0 } = useQuery({
    queryKey: ["creator-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "creator")
        .in("verification_status", ["approved", "active"]);
      return count ?? 0;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <HeroSection />
      <FeaturedCreators creators={featuredCreators} />
      <CategoriesSection />
      <HowItWorks />
      <CreatorBenefits />
      <BrandBenefits />
      <PlatformStats />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  );

  function FeaturedCreators({ creators }: { creators: any[] }) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>{t("landing.featuresEyebrow")}</Eyebrow>
            <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{t("landing.featuresTitle")}</h2>
          </div>
          <Link to="/marketplace" className="hidden sm:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t("marketplace.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {creators.length === 0 ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-border bg-card p-8 animate-pulse">
                <div className="mx-auto h-20 w-20 rounded-full bg-warm" />
                <div className="mx-auto mt-4 h-4 w-32 rounded bg-warm" />
                <div className="mx-auto mt-2 h-3 w-24 rounded bg-warm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to="/creator/$id"
                  params={{ id: c.id }}
                  className="group block rounded-3xl border border-border bg-card p-8 hover-lift text-center transition-all duration-300 hover:shadow-md"
                >
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-warm ring-2 ring-white shadow-md">
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.display_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center font-display text-2xl font-semibold text-foreground/20">
                        {c.display_name?.[0] ?? "·"}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{c.display_name}</h3>
                  {c.category && (
                    <span className="mt-1 inline-block rounded-full bg-accent/5 px-3 py-0.5 text-[11px] font-medium text-accent">
                      {CATEGORY_LABELS[c.category as Category]}
                    </span>
                  )}
                  {c.city && (
                    <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {c.city}
                    </p>
                  )}
                  {c.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{c.bio}</p>}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
        <div className="mt-10 text-center sm:hidden">
          <Link to="/marketplace">
            <Button variant="outline" className="rounded-2xl">{t("marketplace.viewAll")} <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>
    );
  }

  function CategoriesSection() {
    return (
      <section className="border-y border-border bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <Eyebrow>{t("landing.howEyebrow")}</Eyebrow>
          <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{t("marketplace.categories")}</h2>
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link
                  to="/marketplace"
                  className="flex h-32 flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-4 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                >
                  <span className="text-2xl">{CATEGORY_ICONS[cat as Category] ?? "·"}</span>
                  <span className="text-sm font-medium">{CATEGORY_LABELS[cat as Category]}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function HowItWorks() {
    const steps = [
      { n: "01", title: t("landing.howStep1Title"), body: t("landing.howStep1Body") },
      { n: "02", title: t("landing.howStep2Title"), body: t("landing.howStep2Body") },
      { n: "03", title: t("landing.howStep3Title"), body: t("landing.howStep3Body") },
    ];
    return (
      <section className="border-y border-border bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <Eyebrow>{t("landing.howEyebrow")}</Eyebrow>
          <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{t("landing.howTitle")}</h2>
          <div className="mt-14 grid gap-12 lg:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n}>
                <p className="font-display text-5xl text-accent">{s.n}</p>
                <h3 className="mt-4 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function CreatorBenefits() {
    return (
      <BenefitSection
        eyebrow={t("landing.creatorBenefitsEyebrow")}
        title={t("landing.creatorBenefitsTitle")}
        items={[t("landing.creatorBenefit1"), t("landing.creatorBenefit2"), t("landing.creatorBenefit3")]}
        accent={Heart}
        cta={{ label: t("nav.joinCreator"), to: "/auth", search: { mode: "signup", role: "creator" } }}
      />
    );
  }

  function BrandBenefits() {
    return (
      <BenefitSection
        eyebrow={t("landing.brandBenefitsEyebrow")}
        title={t("landing.brandBenefitsTitle")}
        items={[t("landing.brandBenefit1"), t("landing.brandBenefit2"), t("landing.brandBenefit3")]}
        accent={BarChart3}
        cta={{ label: t("landing.ctaSecondary"), to: "/marketplace" }}
        reverse
      />
    );
  }

  function PlatformStats() {
    const { data: stats } = useQuery({
      queryKey: ["platform-stats"],
      queryFn: async () => {
        const [creatorsRes, brandsRes, collabsRes, productsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "creator").in("verification_status", ["approved", "active"]),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "brand").in("verification_status", ["approved", "active"]),
          supabase.from("brand_requests").select("id", { count: "exact", head: true }).eq("status", "accepted"),
          supabase.from("products").select("id", { count: "exact", head: true }),
        ]);
        return {
          creators: creatorsRes.count ?? 0,
          brands: brandsRes.count ?? 0,
          collaborations: collabsRes.count ?? 0,
          products: productsRes.count ?? 0,
        };
      },
    });
    return (
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <Eyebrow>{t("landing.testimonialsEyebrow")}</Eyebrow>
        <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{t("landing.testimonialsTitle")}</h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("landing.statCreators"), value: stats?.creators ?? 0, icon: Users },
            { label: t("landing.statBrands"), value: stats?.brands ?? 0, icon: BarChart3 },
            { label: t("landing.statCollaborations"), value: stats?.collaborations ?? 0, icon: Handshake },
            { label: t("landing.statProducts"), value: stats?.products ?? 0, icon: Sparkles },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-3xl border border-border bg-card p-8 text-center hover-lift">
              <s.icon className="mx-auto h-8 w-8 text-accent" />
              <p className="mt-4 font-display text-4xl font-semibold">
                {s.value.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  function Pricing() {
    const freeFeatures = [t("landing.creatorBenefit1"), t("landing.creatorBenefit3"), t("subscription.limitedCollections"), t("subscription.limitedProducts")];
    const proFeatures = [t("subscription.proUnlimited"), t("subscription.priorityRanking"), t("subscription.proBadge"), t("subscription.analytics"), t("subscription.featuredCreator")];
    const brandFeatures = [t("subscription.unlimitedSearch"), t("subscription.advancedFilters"), t("subscription.saveCreators"), t("subscription.unlimitedRequests"), t("subscription.campaignManagement")];
    return (
      <section className="border-y border-border bg-cream">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <Eyebrow>{t("landing.pricingEyebrow")}</Eyebrow>
          <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{t("landing.pricingTitle")}</h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t("subscription.free")}</p>
              <p className="mt-3 font-display text-4xl font-semibold">{t("subscription.freePrice")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("subscription.freeDesc")}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{f}</span></li>
                ))}
              </ul>
              <Link to="/auth" search={{ mode: "signup" }} className="mt-8 block">
                <Button variant="accent" className="w-full rounded-full">{t("subscription.startFree")}</Button>
              </Link>
            </div>
            <div className="relative rounded-3xl border-2 border-foreground bg-foreground p-8 text-background shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  <Sparkles className="h-3 w-3" /> {t("subscription.mostPopular")}
                </span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-background/60">{t("subscription.creatorPro")}</p>
              <p className="mt-3 font-display text-4xl font-semibold">{t("subscription.proPrice")}</p>
              <p className="mt-2 text-sm text-background/70">{t("subscription.proDesc")}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <Link to="/auth" search={{ mode: "signup" }} className="mt-8 block">
                <Button variant="accent" className="w-full rounded-full">{t("subscription.upgradePro")}</Button>
              </Link>
            </div>
            <div className="rounded-3xl border border-border bg-card p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#92400E]">{t("subscription.brand")}</p>
              <p className="mt-3 font-display text-4xl font-semibold">{t("subscription.brandPrice")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("subscription.brandDesc")}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {brandFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{f}</span></li>
                ))}
              </ul>
              <Link to="/auth" search={{ mode: "signup", role: "brand" }} className="mt-8 block">
                <Button variant="accent" className="w-full rounded-full">{t("subscription.startBrand")}</Button>
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link to="/pricing" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
              {t("landing.viewPricing")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  function FAQ() {
    const items = [
      { q: t("landing.faqQ1"), a: t("landing.faqA1") },
      { q: t("landing.faqQ2"), a: t("landing.faqA2") },
      { q: t("landing.faqQ3"), a: t("landing.faqA3") },
      { q: t("landing.faqQ4"), a: t("landing.faqA4") },
      { q: t("landing.faqQ5"), a: t("landing.faqA5") },
      { q: t("landing.faqQ6"), a: t("landing.faqA6") },
    ];
    return (
      <section className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
        <Eyebrow>{t("landing.faqEyebrow")}</Eyebrow>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{t("landing.faqTitle")}</h2>
        <Accordion type="single" collapsible className="mt-10">
          {items.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}>
              <AccordionTrigger className="text-left font-display text-lg">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    );
  }

  function Footer() {
    return (
      <footer className="border-t border-border bg-cream">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 sm:grid-cols-2">
          <div>
            <p className="font-display text-xl font-semibold">{t("landing.brandName")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.footerTagline")}</p>
          </div>
          <div className="flex items-end justify-start sm:justify-end text-sm text-muted-foreground">
            {t("landing.copyright", { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    );
  }
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{children}</p>;
}

function BenefitSection({
  eyebrow, title, items, accent: Icon, cta, reverse,
}: {
  eyebrow: string; title: string; items: string[]; accent: typeof Inbox;
  cta: { label: string; to: string; search?: Record<string, string> }; reverse?: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
      <div className={`grid items-center gap-8 lg:gap-12 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{title}</h2>
          <ul className="mt-8 space-y-3">
            {items.map((it) => (
              <li key={it} className="flex items-start gap-3 text-base">
                <Check className="mt-1 h-4 w-4 shrink-0 text-accent" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
          <Link to={cta.to as never} search={cta.search as never} className="mt-8 inline-block">
            <Button variant="accent" size="lg" className="rounded-full px-6">{cta.label} <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </div>
        <div className="relative mx-auto w-full max-w-[370px] aspect-[9/16] overflow-hidden rounded-3xl bg-gradient-to-br from-warm via-cream to-background p-12">
          {Icon === Heart ? (
            <div className="absolute inset-8 overflow-y-auto overflow-x-hidden rounded-2xl bg-white shadow-xl [&::-webkit-scrollbar]:hidden">
              {/* Top Navigation */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4 text-gray-700"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
                <div className="flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-gray-500"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8m-4-6-4-4-4 4m4-4v12"/></svg>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-600"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                </div>
              </div>
              {/* Profile Section */}
              <div className="flex items-start gap-3.5 px-4 pt-3 pb-2.5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-[3px] border-white shadow-md">
                  <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&h=200&fit=crop&crop=face" alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold leading-tight">{t("landing.mock.name")}</p>
                  </div>
                  <p className="text-[11px] text-gray-400">{t("landing.mock.username")}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-gray-500">{t("landing.mock.bio")}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-pink-600"><svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600"><svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.72 9.38c.015.23.02.46.02.69 0 7.03-5.35 7.93-8.7 7.93-1.72 0-3.32-.25-4.47-.71.25.03.5.04.75.04 1.47 0 2.82-.5 3.89-1.34-1.37-.03-2.52-.93-2.92-2.17.19.04.38.06.58.06.28 0 .56-.04.82-.11-1.43-.29-2.51-1.55-2.51-3.07v-.04c.42.24.91.39 1.43.41-.85-.57-1.42-1.55-1.42-2.66 0-.59.16-1.14.44-1.62 1.54 1.89 3.84 3.14 6.44 3.27-.05-.23-.08-.47-.08-.72 0-1.74 1.41-3.15 3.15-3.15.9 0 1.72.38 2.29 1 .72-.14 1.39-.4 2-.76-.24.74-.74 1.36-1.4 1.76.64-.08 1.25-.25 1.82-.5-.43.64-.97 1.2-1.59 1.65z"/></svg></span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600"><svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></span>
                  </div>
                </div>
              </div>
              {/* Statistics Card */}
              <div className="mx-4 mb-3 mt-2 flex divide-x divide-gray-100 overflow-hidden rounded-2xl bg-gray-50 shadow-sm">
                {[{ label: t("landing.mock.followers"), value: t("landing.mock.followersValue") }, { label: t("landing.mock.products"), value: t("landing.mock.productsValue") }, { label: t("landing.mock.collections"), value: t("landing.mock.collectionsValue") }].map((s) => (
                  <div key={s.label} className="flex flex-1 flex-col items-center py-3">
                    <p className="text-sm font-bold">{s.value}</p>
                    <p className="text-[8px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Featured Products */}
              <div className="px-4 pb-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="font-display text-sm font-semibold tracking-tight text-[#1A1A1A]">{t("landing.mock.featuredProducts")}</p>
                  <span className="cursor-pointer text-[8px] text-gray-400 transition-opacity hover:opacity-60">{t("landing.mock.seeAll")}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {[
                    { name: t("landing.mock.product1Name"), price: t("landing.mock.product1Price"), img: "https://images.unsplash.com/photo-1559070081-648fb00b2ed1?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.product2Name"), price: t("landing.mock.product2Price"), img: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.product3Name"), price: t("landing.mock.product3Price"), img: "https://images.unsplash.com/photo-1760920248537-c1185bbc5c61?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.product4Name"), price: t("landing.mock.product4Price"), img: "https://images.unsplash.com/photo-1767391255584-763f98ced9d0?w=200&h=200&fit=crop&crop=center" },
                  ].map((p) => (
                    <div key={p.name} className="group w-[95px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative aspect-square">
                        <img src={p.img} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm transition-opacity group-hover:opacity-80">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" className="h-2.5 w-2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </span>
                      </div>
                      <div className="p-2">
                        <p className="truncate text-[9px] font-medium text-[#1A1A1A]">{p.name}</p>
                        <p className="mt-1 text-[9px] font-semibold text-gray-700">{p.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Summer Favorites */}
              <div className="px-4 pb-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="font-display text-sm font-semibold tracking-tight text-[#1A1A1A]">{t("landing.mock.summerFavorites")}</p>
                  <span className="cursor-pointer text-[8px] text-gray-400 transition-opacity hover:opacity-60">{t("landing.mock.seeAll")}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {[
                    { name: t("landing.mock.summer1Name"), price: t("landing.mock.summer1Price"), img: "https://images.unsplash.com/photo-1565276645994-f72f0598febf?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.summer2Name"), price: t("landing.mock.summer2Price"), img: "https://images.unsplash.com/photo-1565592284342-7ed1636f409f?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.summer3Name"), price: t("landing.mock.summer3Price"), img: "https://images.unsplash.com/photo-1601980265524-04468b355ac3?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.summer4Name"), price: t("landing.mock.summer4Price"), img: "https://images.unsplash.com/photo-1625899845678-3fad6a4a1846?w=200&h=200&fit=crop&crop=center" },
                  ].map((p) => (
                    <div key={p.name} className="group w-[80px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative aspect-square">
                        <img src={p.img} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-1.5">
                        <p className="truncate text-[8px] font-medium text-[#1A1A1A]">{p.name}</p>
                        {p.price && <p className="mt-0.5 text-[8px] font-semibold text-gray-700">{p.price}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Collections */}
              <div className="px-4 pb-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="font-display text-sm font-semibold tracking-tight text-[#1A1A1A]">{t("landing.mock.collectionsTitle")}</p>
                  <span className="cursor-pointer text-[8px] text-gray-400 transition-opacity hover:opacity-60">{t("landing.mock.seeAll")}</span>
                </div>
                <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {[
                    { name: t("landing.mock.collection1Name"), img: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.collection2Name"), img: "https://images.unsplash.com/photo-1657603726278-a9f12ca2c8d7?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.collection3Name"), img: "https://images.unsplash.com/photo-1664623737694-fd3d0e144842?w=200&h=200&fit=crop&crop=center" },
                    { name: t("landing.mock.collection4Name"), img: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=200&h=200&fit=crop&crop=center" },
                  ].map((c) => (
                    <div key={c.name} className="group w-[90px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative aspect-square">
                        <img src={c.img} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-1.5">
                        <p className="truncate text-[9px] font-medium text-[#1A1A1A]">{c.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Shop My Picks Button */}
              <div className="px-4 pb-4">
                <button className="w-full rounded-xl bg-black py-2.5 text-[10px] font-semibold text-white">
                  {t("landing.mock.shopMyPicks")}
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-8 grid place-items-center rounded-2xl bg-card shadow-xl">
              <Icon className="h-20 w-20 text-accent/40" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}