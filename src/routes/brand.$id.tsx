import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  MapPin,
  Globe,
  Flag,
  Star,
  ExternalLink,
  Send,
  Check,
} from "lucide-react";
import { useT, t } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/report-dialog";
import { formatFollowers } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/brand/$id")({
  head: () => ({ meta: [{ title: "Brand Profile — creator·kz" }] }),
  component: BrandProfilePublic,
  notFoundComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F5]">
        <div className="text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
            {t("creatorProfile.notFoundLink")}
          </Link>
        </div>
      </div>
    );
  },
});

function BrandProfilePublic() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: brand, isLoading, isError } = useQuery({
    queryKey: ["brand-public", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data || (data.role !== "brand" && data.role !== "admin")) throw new Error("Not found");
      if (data.verification_status !== "approved" && data.verification_status !== "active") {
        throw new Error("Not found");
      }
      return data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["public-reviews", "brand", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_reviews")
        .select("*, reviewer:profiles!brand_reviews_reviewer_id_fkey(display_name, avatar_url)")
        .eq("brand_id", id)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!brand || isLoading) return;
    supabase.from("profile_views").insert({ viewed_id: id, viewer_id: user?.id ?? null }).then().catch(() => {});
  }, [id, !!brand]);

  function shareProfile() {
    if (navigator.share) {
      navigator.share({ title: brand?.display_name, url: window.location.href });
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
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
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

  if (!brand) return null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-16 py-8 sm:py-16">
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
                    <button onClick={() => { setReportOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5">
                      <Flag className="h-4 w-4" /> {t("report.reportCreator")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Brand Profile Header */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-border/40">
          <div className="flex flex-col items-center text-center md:flex-row md:text-left gap-6">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full bg-warm ring-[5px] ring-white shadow-xl">
              {brand.avatar_url ? (
                <img src={brand.avatar_url} alt={brand.display_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-4xl font-semibold text-foreground/20">
                  {brand.display_name?.[0] ?? "B"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {brand.brand_name || brand.display_name}
              </h1>
              {brand.industry && (
                <p className="mt-0.5 text-sm text-muted-foreground">{brand.industry}</p>
              )}
              {brand.bio && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3 break-words">
                  {brand.bio}
                </p>
              )}
              {brand.city && (
                <div className="mt-2 flex items-center justify-center md:justify-start gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{brand.city}{brand.country ? `, ${brand.country}` : ""}</span>
                </div>
              )}
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                  <Globe className="h-3.5 w-3.5" />
                  {brand.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm border border-border/40">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-lg font-semibold">{t("admin.reviews")}</h2>
              <span className="text-xs text-muted-foreground">({reviews.length})</span>
              <div className="flex items-center gap-1 ml-auto">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-4 w-4 ${star <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                ))}
                <span className="ml-1 text-sm font-medium">{avgRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="space-y-3">
              {reviews.map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-border/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-warm overflow-hidden shrink-0">
                      {r.reviewer?.avatar_url ? (
                        <img src={r.reviewer.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] font-medium text-muted-foreground">
                          {r.reviewer?.display_name?.[0] ?? "?"}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">{r.reviewer?.display_name || "Anonymous"}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-3.5 w-3.5 ${star <= (r.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mt-1">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact / save for non-owners */}
        {user?.id !== id && (
          <div className="mt-6">
            <Button className="w-full rounded-2xl h-12" onClick={() => {
              if (!user) { navigate({ to: "/auth" }); return; }
              navigate({ to: `/brand?page=messages&chat=${id}` });
            }}>
              <Send className="mr-2 h-4 w-4" /> Contact Brand
            </Button>
          </div>
        )}
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} reportedId={id} userType="brand" />
    </div>
  );
}
