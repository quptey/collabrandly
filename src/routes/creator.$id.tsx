import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  MapPin,
  Heart,
  Send,
  Handshake,
  Check,
  ChevronRight,
  ExternalLink,
  Globe,
  Flag,
} from "lucide-react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { SiteHeader } from "@/components/site-header";
import { CreatorReputation } from "@/components/creator-reputation";
import { AudienceIndicator } from "@/components/audience-indicator";
import { PaidReportButton } from "@/components/paid-report-button";
import { Button } from "@/components/ui/button";
import { ContactCreatorDialog } from "@/components/contact-creator-dialog";
import { ReportDialog } from "@/components/report-dialog";
import {
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  TelegramIcon,
  XIcon,
  FacebookIcon,
  LinkedInIcon,
  PinterestIcon,
} from "@/components/social-icons";
import { SOCIAL_PLATFORM_COLUMNS, SOCIAL_PLATFORMS_DATA } from "@/lib/constants";
import { formatFollowers } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PlatformStyle = {
  container: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
};

const PLATFORM_STYLES: Record<string, PlatformStyle> = {
  instagram: {
    container: "",
    icon: InstagramIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  tiktok: {
    container: "",
    icon: TikTokIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  youtube: {
    container: "",
    icon: YouTubeIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  telegram: {
    container: "",
    icon: TelegramIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  facebook: {
    container: "",
    icon: FacebookIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  x: {
    container: "",
    icon: XIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  pinterest: {
    container: "",
    icon: PinterestIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  linkedin: {
    container: "",
    icon: LinkedInIcon,
    iconClass: "h-[18px] w-[18px] shrink-0",
  },
  website: {
    container: "rounded-full bg-muted-foreground/40",
    icon: Globe,
    iconClass: "h-[18px] w-[18px] shrink-0 brightness-0 invert",
  },
};

export const Route = createFileRoute("/creator/$id")({
  head: () => ({ meta: [{ title: "Creator — creator·kz" }] }),
  component: CreatorProfilePublic,
  notFoundComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F5]">
        <div className="text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("creatorProfile.notFoundLink")}
          </Link>
        </div>
      </div>
    );
  },
  errorComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground bg-[#FAF8F5]">
        {t("creatorProfile.error")}
      </div>
    );
  },
});

function CreatorProfilePublic() {
  const { id } = Route.useParams();
  const { user, role: currentRole } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isBrand = currentRole === "brand";
  const { t } = useT();

  const {
    data: creator,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["creator-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Not found");
      if (data.verification_status !== "approved" && data.verification_status !== "active") {
        throw new Error("Not found");
      }
      return data;
    },
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["creator-public-collections", id],
    enabled: !!creator,
    queryFn: async () => {
      const { data } = await supabase
        .from("collections")
        .select("*, products(count)")
        .eq("creator_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["creator-public-products", id],
    enabled: !!creator,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", id)
        .order("position", { ascending: true })
        .limit(20);
      return data ?? [];
    },
  });

  const { data: portfolio = [] } = useQuery({
    queryKey: ["creator-public-portfolio", id],
    enabled: !!creator,
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolio_photos")
        .select("*")
        .eq("creator_id", id)
        .order("position", { ascending: true });
      return data ?? [];
    },
  });

  const followerCount = creator?.follower_count ?? 0;

  const { data: isSaved = false } = useQuery({
    queryKey: ["creator-saved", user?.id, id],
    enabled: !!user && isBrand,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_creators")
        .select("id")
        .eq("brand_id", user!.id)
        .eq("creator_id", id)
        .maybeSingle();
      return !!data;
    },
  });

  const productCount = products.length;
  const collectionCount = collections.length;

  // Track profile view
  useEffect(() => {
    if (!creator || isLoading) return;
    supabase
      .from("profile_views")
      .insert({
        viewed_id: id,
        viewer_id: user?.id ?? null,
      })
      .then()
      .catch(() => {});
    // Update creator_stats profile_views counter
    supabase
      .rpc("increment_creator_stat", { p_creator_id: id, p_stat: "profile_views" })
      .then()
      .catch(() => {});
    trackEvent("creator_profile_viewed", { creatorId: id });
  }, [id, !!creator]);

  function openContactDialog() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    trackEvent("contact_dialog_opened", { creatorId: id });
    setContactOpen(true);
  }

  async function toggleSave() {
    if (!user) {
      toast.error(t("creatorProfile.signInToSave"));
      return;
    }
    if (isSaved) {
      const { error } = await supabase
        .from("saved_creators")
        .delete()
        .eq("brand_id", user.id)
        .eq("creator_id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t("creatorProfile.removedFromShortlist"));
    } else {
      const { error } = await supabase
        .from("saved_creators")
        .insert({ brand_id: user.id, creator_id: id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t("creatorProfile.savedToShortlist"));
    }
    trackEvent(isSaved ? "creator_unsaved" : "creator_saved", { creatorId: id });
    qc.invalidateQueries({ queryKey: ["creator-saved", user?.id, id] });
  }

  async function startCollaboration() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: `/brand?page=messages&chat=${id}` });
    toast.success(t("trust.openChatHint"));
  }

  function shareProfile() {
    if (navigator.share) {
      navigator.share({ title: creator?.display_name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(t("creatorProfile.linkCopied"));
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("creatorProfile.linkCopied"));
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("creatorProfile.notFoundLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
          {t("creatorProfile.loading")}
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("creatorProfile.notFoundLink")}
          </Link>
        </div>
      </div>
    );
  }

  const langLabels: Record<string, string> = { en: "EN", ru: "RU", kk: "KZ" };
  const languages: string[] = Array.isArray(creator?.languages) ? creator.languages : [];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <SiteHeader />

      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-16 py-8 sm:py-16">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/marketplace"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="h-5 w-5 text-foreground/70" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={shareProfile}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <Share2 className="h-5 w-5 text-foreground/70" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <MoreHorizontal className="h-5 w-5 text-foreground/70" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-border/60 bg-white p-2 shadow-xl">
                    <button
                      onClick={() => {
                        copyLink();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-secondary/40"
                    >
                      <ExternalLink className="h-4 w-4" /> {t("creatorProfile.copyProfileLink")}
                    </button>
                    <button
                      onClick={() => {
                        shareProfile();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-secondary/40"
                    >
                      <Share2 className="h-4 w-4" /> {t("creatorProfile.shareProfile")}
                    </button>
                    <button
                      onClick={() => {
                        setReportOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5"
                    >
                      <Flag className="h-4 w-4" /> {t("report.reportCreator")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Header - horizontal layout */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-border/40">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            {/* Left: Avatar */}
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-warm ring-[5px] ring-white shadow-xl">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-4xl font-semibold text-foreground/20">
                  {creator.display_name?.[0] ?? "·"}
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {creator.display_name}
              </h1>

              {creator.username && (
                <p className="mt-0.5 text-sm text-muted-foreground">@{creator.username}</p>
              )}

              {creator.bio && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3 break-words">
                  {creator.bio}
                </p>
              )}

              {/* Location */}
              {creator.city && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {creator.city}
                    {creator.country ? `, ${creator.country}` : ""}
                  </span>
                </div>
              )}

              {/* Languages */}
              {languages.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  {languages.map((l) => (
                    <span
                      key={l}
                      className="rounded-full bg-secondary/40 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {langLabels[l] ?? l}
                    </span>
                  ))}
                </div>
              )}

              {/* Social Media Icons - circular brand-colored buttons */}
              <SocialIconButtons profile={creator} />
            </div>
          </div>
        </div>

        {/* Trust Bar — visible to everyone */}
        <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm border border-border/40">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight">
                {formatFollowers(followerCount)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                {t("creatorProfile.followers")}
              </p>
            </div>
            {creator.engagement_rate && (
              <div>
                <p className="font-display text-2xl font-semibold tracking-tight">
                  {creator.engagement_rate}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                  ER
                </p>
              </div>
            )}
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight">
                {(creator.completed_deals ?? 0) + (creator.complaints_count ?? 0)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                {t("trust.deals")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground border-t border-border/20 pt-3">
            {/* City */}
            {creator.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {creator.city}
              </span>
            )}
            {/* Reputation */}
            <CreatorReputation
              creatorId={creator.id}
              completedDeals={creator.completed_deals ?? 0}
              complaintsCount={creator.complaints_count ?? 0}
              compact
            />
            {/* Audience quality */}
            {creator.audience_quality && (
              <AudienceIndicator quality={creator.audience_quality} />
            )}
            {/* Audience demographics */}
            {(creator.audience_gender || creator.audience_age || creator.audience_cities) && (
              <span className="text-muted-foreground/60">
                {[creator.audience_gender, creator.audience_age, creator.audience_cities]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
        </div>

        {/* Brand Actions */}
        {isBrand && (
          <div className="mt-4 space-y-3">
            <Button
              className="w-full rounded-2xl h-12 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={startCollaboration}
            >
              <Handshake className="mr-2 h-5 w-5" />
              {t("trust.proposeCollaboration")}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-2xl h-11" onClick={toggleSave}>
                <Heart className={`mr-2 h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                {isSaved ? t("creatorProfile.saved") : t("creatorProfile.saveCreator")}
              </Button>
              <Button variant="outline" className="rounded-2xl h-11" onClick={copyLink}>
                <Share2 className="mr-2 h-4 w-4" /> {t("creatorProfile.share")}
              </Button>
            </div>
          </div>
        )}

        {/* Additional Verification */}
        {isBrand && (
          <section className="mt-8">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
              <h3 className="font-display text-base font-semibold mb-1">
                {t("trust.extraCheckTitle")}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t("trust.extraCheckDesc")}
              </p>
              <ul className="space-y-1.5 mb-4">
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-accent shrink-0" /> {t("trust.reportDetailHistory")}
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-accent shrink-0" /> {t("trust.reportDetailComplaints")}
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-accent shrink-0" /> {t("trust.reportDetailAudience")}
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-accent shrink-0" /> {t("trust.reportDetailRecommendations")}
                </li>
              </ul>
              <PaidReportButton creatorId={creator.id} creatorName={creator.display_name} />
            </div>
          </section>
        )}

        {/* Featured Products */}
        {products.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {t("creatorProfile.featuredProducts")}
              </h2>
              <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {t("creatorProfile.seeAll")} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {products.map((product: any) => (
                <div key={product.id} className="min-w-[180px] max-w-[180px] shrink-0">
                  <div className="group overflow-hidden rounded-2xl bg-white shadow-sm border border-border/40 transition-shadow duration-200 hover:shadow-md">
                    <div className="relative aspect-[4/5] overflow-hidden bg-warm">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-muted-foreground/30">
                          {t("creatorProfile.noImage")}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave();
                        }}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:scale-110"
                      >
                        <Heart
                          className={`h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : "text-foreground/70"}`}
                        />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      {product.description && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Summer Favorites / Collections Carousel */}
        {collections.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {t("creatorProfile.summerFavorites")}
              </h2>
              <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {t("creatorProfile.seeAll")} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {collections.slice(0, 6).map((col: any) => {
                const count = (col.products as { count: number }[] | null)?.[0]?.count ?? 0;
                return (
                  <div key={col.id} className="min-w-[200px] max-w-[200px] shrink-0">
                    <Link to="/dashboard/collection/$id" params={{ id: col.id } as any}>
                      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-border/40">
                        <div className="aspect-[16/10] overflow-hidden bg-warm">
                          {col.cover_url ? (
                            <img
                              src={col.cover_url}
                              alt={col.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center font-display text-xl text-foreground/20">
                              {col.title[0]}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-medium">{col.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {count}{" "}
                            {count === 1
                              ? t("creatorProfile.product")
                              : t("creatorProfile.products")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Collections Grid */}
        {collections.length > 0 && (
          <section className="mt-8 mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {t("creatorProfile.collectionsTitle")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {collectionCount} {t("creatorProfile.total")}
              </span>
            </div>
            <div className="space-y-4">
              {collections.map((col: any) => {
                const count = (col.products as { count: number }[] | null)?.[0]?.count ?? 0;
                return (
                  <Link
                    key={col.id}
                    to="/dashboard/collection/$id"
                    params={{ id: col.id } as any}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-border/40 hover:border-accent/50 transition-colors"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-warm">
                      {col.cover_url ? (
                        <img
                          src={col.cover_url}
                          alt={col.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center font-display text-lg text-foreground/20">
                          {col.title[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold">{col.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {count}{" "}
                        {count === 1 ? t("creatorProfile.product") : t("creatorProfile.products")}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Portfolio Gallery */}
        {portfolio.length > 0 && (
          <section className="mt-8 mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">
                {t("creatorProfile.portfolio")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {portfolio.length} {t("creatorProfile.photos")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {portfolio.map((photo: any) => (
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-border/40"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-warm">
                    <img
                      src={photo.url}
                      alt={photo.caption || ""}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  {photo.is_cover && (
                    <span className="absolute left-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      {t("creatorProfile.cover")}
                    </span>
                  )}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                      <p className="text-xs text-white">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {!isBrand && user?.id !== id && (
          <div className="mt-5 mb-12">
            <Button className="w-full rounded-2xl h-12" onClick={openContactDialog}>
              <Send className="mr-2 h-4 w-4" /> {t("creatorProfile.contactCreator")}
            </Button>
          </div>
        )}
      </div>

      <ContactCreatorDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        creatorId={creator.id}
        creatorName={creator.display_name}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedId={creator.id}
        userType="creator"
      />
    </div>
  );
}

function SocialIconButtons({ profile }: { profile: Record<string, unknown> }) {
  const links: { platform: string; url: string }[] = [];

  for (const [platform, column] of Object.entries(SOCIAL_PLATFORM_COLUMNS)) {
    const val = profile[column];
    if (typeof val === "string" && val.trim()) {
      links.push({ platform, url: val.trim() });
    }
  }

  if (links.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const style = PLATFORM_STYLES[link.platform] ?? PLATFORM_STYLES.website;
        const Icon = style.icon;
        return (
          <a
            key={link.platform}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center overflow-hidden transition-all duration-150 hover:scale-105 hover:shadow-md ${style.container}`}
            style={{ width: 24, height: 24 }}
          >
            <Icon className={style.iconClass} />
          </a>
        );
      })}
    </div>
  );
}
