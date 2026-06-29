import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Share2, MoreHorizontal, Globe, MapPin, Heart,
  MessageCircle, Send, Check, ChevronRight, ExternalLink
} from "lucide-react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ContactCreatorDialog } from "@/components/contact-creator-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/creator/$id")({
  head: () => ({ meta: [{ title: "Creator — creator·kz" }] }),
  component: CreatorProfilePublic,
  notFoundComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F5]">
        <div className="text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">{t("creatorProfile.notFoundLink")}</Link>
        </div>
      </div>
    );
  },
  errorComponent: () => {
    const { t } = useT();
    return <div className="grid min-h-screen place-items-center text-muted-foreground bg-[#FAF8F5]">{t("creatorProfile.error")}</div>;
  },
});

function CreatorProfilePublic() {
  const { id } = Route.useParams();
  const { user, role: currentRole } = useAuth();
  const qc = useQueryClient();
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isBrand = currentRole === "brand";
  const { t } = useT();

  const { data: creator, isLoading, isError } = useQuery({
    queryKey: ["creator-public", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
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

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["creator-followers", id],
    enabled: !!creator,
    queryFn: async () => {
      const { count } = await supabase.from("saved_creators").select("id", { count: "exact", head: true }).eq("creator_id", id);
      return count ?? 0;
    },
  });

  const { data: isSaved = false } = useQuery({
    queryKey: ["creator-saved", user?.id, id],
    enabled: !!user && isBrand,
    queryFn: async () => {
      const { data } = await supabase.from("saved_creators").select("id").eq("brand_id", user!.id).eq("creator_id", id).maybeSingle();
      return !!data;
    },
  });

  const productCount = products.length;
  const collectionCount = collections.length;

  // Track profile view
  useEffect(() => {
    if (!creator || isLoading) return;
    supabase.from("profile_views").insert({
      viewed_id: id,
      viewer_id: user?.id ?? null,
    }).then().catch(() => {});
    // Update creator_stats profile_views counter
    supabase.rpc("increment_creator_stat", { p_creator_id: id, p_stat: "profile_views" })
      .then().catch(() => {});
  }, [id, !!creator]);

  async function toggleSave() {
    if (!user) { toast.error(t("creatorProfile.signInToSave")); return; }
    if (isSaved) {
      await supabase.from("saved_creators").delete().eq("brand_id", user.id).eq("creator_id", id);
      toast.success(t("creatorProfile.removedFromShortlist"));
    } else {
      await supabase.from("saved_creators").insert({ brand_id: user.id, creator_id: id });
      toast.success(t("creatorProfile.savedToShortlist"));
    }
    qc.invalidateQueries({ queryKey: ["creator-saved", user?.id, id] });
  }

  async function sendMessage() {
    if (!user) { toast.error(t("creatorProfile.signInRequired")); return; }
    await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: id,
      body: "Hi! I'd like to connect regarding a potential collaboration.",
    });
    toast.success(t("creatorProfile.messageSent"));
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
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">{t("creatorProfile.notFoundLink")}</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">{t("creatorProfile.loading")}</div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">{t("creatorProfile.notFoundLink")}</Link>
        </div>
      </div>
    );
  }

  const langLabels: Record<string, string> = { en: "EN", ru: "RU", kk: "KZ" };
  const languages: string[] = Array.isArray(creator?.languages) ? creator.languages : [];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <SiteHeader />

      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/marketplace" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow">
            <ArrowLeft className="h-5 w-5 text-foreground/70" />
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={shareProfile} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow">
              <Share2 className="h-5 w-5 text-foreground/70" />
            </button>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow">
                <MoreHorizontal className="h-5 w-5 text-foreground/70" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-border/60 bg-white p-2 shadow-xl">
                    <button onClick={() => { copyLink(); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-secondary/40">
                      <ExternalLink className="h-4 w-4" /> {t("creatorProfile.copyProfileLink")}
                    </button>
                    <button onClick={() => { shareProfile(); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-secondary/40">
                      <Share2 className="h-4 w-4" /> {t("creatorProfile.shareProfile")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-border/40">
          <div className="text-center">
            {/* Avatar */}
            <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-warm ring-4 ring-white shadow-lg">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.display_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-3xl font-semibold text-foreground/20">
                  {creator.display_name?.[0] ?? "·"}
                </div>
              )}
            </div>

            {/* Name */}
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{creator.display_name}</h1>

            {/* Username */}
            {creator.username && (
              <p className="mt-0.5 text-sm text-muted-foreground">@{creator.username}</p>
            )}

            {/* Location */}
            {creator.city && (
              <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{creator.city}{creator.country ? `, ${creator.country}` : ""}</span>
              </div>
            )}

            {/* Languages */}
            {languages.length > 0 && (
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {languages.map((l) => (
                  <span key={l} className="rounded-full bg-secondary/40 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {langLabels[l] ?? l}
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {creator.bio && (
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">{creator.bio}</p>
            )}

            {/* Social Link */}
            {creator.social_link && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <a href={creator.social_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#FAF8F5] px-5 py-2 text-sm font-medium hover:bg-secondary/40 transition-colors">
                  <Globe className="h-4 w-4" />
                  Follow
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm border border-border/40">
          <div className="grid grid-cols-3 divide-x divide-border/40 text-center">
            <div>
              <p className="font-display text-2xl font-semibold">{followerCount}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{t("creatorProfile.followers")}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{productCount}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{t("creatorProfile.products")}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">{collectionCount}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{t("creatorProfile.collections")}</p>
            </div>
          </div>
        </div>

        {/* Brand Actions */}
        {isBrand && user && (
          <div className="mt-5 rounded-3xl bg-white p-5 shadow-sm border border-border/40">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-2xl h-11" onClick={toggleSave}>
                <Heart className={`mr-2 h-4 w-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                {isSaved ? t("creatorProfile.saved") : t("creatorProfile.saveCreator")}
              </Button>
              <Button variant="outline" className="rounded-2xl h-11" onClick={() => setContactOpen(true)}>
                <Send className="mr-2 h-4 w-4" /> {t("creatorProfile.collaborate")}
              </Button>
              <Button variant="outline" className="rounded-2xl h-11" onClick={sendMessage}>
                <MessageCircle className="mr-2 h-4 w-4" /> {t("creatorProfile.message")}
              </Button>
              <Button variant="outline" className="rounded-2xl h-11" onClick={copyLink}>
                <Share2 className="mr-2 h-4 w-4" /> {t("creatorProfile.share")}
              </Button>
            </div>
          </div>
        )}

        {/* Featured Products */}
        {products.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">{t("creatorProfile.featuredProducts")}</h2>
              <button className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {t("creatorProfile.seeAll")} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
              {products.map((product: any) => (
                <div key={product.id} className="min-w-[160px] max-w-[160px] shrink-0">
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-border/40">
                    <div className="aspect-[4/5] overflow-hidden bg-warm">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-muted-foreground/30">{t("creatorProfile.noImage")}</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      {product.description && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{product.description}</p>}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSave(); }}
                        className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
                        {t("creatorProfile.save")}
                      </button>
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
              <h2 className="font-display text-lg font-semibold">{t("creatorProfile.summerFavorites")}</h2>
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
                            <img src={col.cover_url} alt={col.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center font-display text-xl text-foreground/20">{col.title[0]}</div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-medium">{col.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{count} {count === 1 ? t("creatorProfile.product") : t("creatorProfile.products")}</p>
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
              <h2 className="font-display text-lg font-semibold">{t("creatorProfile.collectionsTitle")}</h2>
              <span className="text-xs text-muted-foreground">{collectionCount} {t("creatorProfile.total")}</span>
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
                        <img src={col.cover_url} alt={col.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center font-display text-lg text-foreground/20">{col.title[0]}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold">{col.title}</p>
                      <p className="text-xs text-muted-foreground">{count} {count === 1 ? t("creatorProfile.product") : t("creatorProfile.products")}</p>
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
              <h2 className="font-display text-lg font-semibold">{t("creatorProfile.portfolio")}</h2>
              <span className="text-xs text-muted-foreground">{portfolio.length} {t("creatorProfile.photos")}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {portfolio.map((photo: any) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-border/40">
                  <div className="aspect-[4/3] overflow-hidden bg-warm">
                    <img src={photo.url} alt={photo.caption || ""} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
            <Button className="w-full rounded-2xl h-12" onClick={() => setContactOpen(true)}>
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
    </div>
  );
}
