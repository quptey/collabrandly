import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Heart, ArrowUpDown } from "lucide-react";
import { t, useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { CreatorCard } from "@/components/creator-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CATEGORIES, CATEGORY_LABELS, CITIES, FOLLOWER_RANGES, type Category, type City, type FollowerRange } from "@/lib/constants";

type SortKey = "newest" | "followers" | "engagement" | "alpha";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: t("marketplace.metaTitle") },
      { name: "description", content: t("marketplace.metaDesc") },
      { property: "og:title", content: t("marketplace.ogTitle") },
      { property: "og:description", content: t("marketplace.ogDesc") },
    ],
  }),
  component: Marketplace,
});

const SORT_LABELS: Record<SortKey, string> = {
  newest: t("marketplace.sortNewest"),
  followers: t("marketplace.sortFollowers"),
  engagement: t("marketplace.sortEngagement"),
  alpha: t("marketplace.sortAlphabetical"),
};

function Marketplace() {
  const { t } = useT();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [city, setCity] = useState<City | "all">("all");
  const [followers, setFollowers] = useState<FollowerRange | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["creators", "marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, category, city, follower_range, role, verification_status, onboarded, website, username")
        .eq("role", "creator")
        .eq("onboarded", true)
        .in("verification_status", ["approved", "active"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved-creator-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_creators")
        .select("creator_id")
        .eq("brand_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((s) => s.creator_id);
    },
  });

  async function toggleSave(creatorId: string, isSaved: boolean) {
    if (!user) return navigate({ to: "/auth", search: { mode: "signin" } });
    if (isSaved) {
      const { error } = await supabase.from("saved_creators").delete().eq("brand_id", user.id).eq("creator_id", creatorId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("saved_creators").insert({ brand_id: user.id, creator_id: creatorId });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["saved-creator-ids"] });
  }

  const filtered = useMemo(() => {
    let result = creators.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (city !== "all" && c.city !== city) return false;
      if (followers !== "all" && c.follower_range !== followers) return false;
      if (q && !c.display_name.toLowerCase().includes(q.toLowerCase()) && !(c.bio ?? "").toLowerCase().includes(q.toLowerCase()) && !(c.username ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });

    switch (sort) {
      case "alpha":
        result.sort((a, b) => a.display_name.localeCompare(b.display_name));
        break;
      case "followers":
        result.sort((a, b) => {
          const order = ["200K+", "50K-200K", "10K-50K", "1K-10K"];
          return order.indexOf(a.follower_range ?? "") - order.indexOf(b.follower_range ?? "");
        });
        break;
      case "newest":
      default:
        break;
    }
    return result;
  }, [creators, category, city, followers, q, sort]);

  const hasFilters = category !== "all" || city !== "all" || followers !== "all" || q.length > 0 || sort !== "newest";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("marketplace.eyebrow")}</p>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">{t("marketplace.title")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? t("common.loading") : `${filtered.length} ${filtered.length === 1 ? t("marketplace.creator") : t("marketplace.creators")}`}
          </p>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_160px_160px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("marketplace.searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v as Category | "all")}>
            <SelectTrigger><SelectValue placeholder={t("marketplace.category")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("marketplace.allCategories")}</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={(v) => setCity(v as City | "all")}>
            <SelectTrigger><SelectValue placeholder={t("marketplace.city")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("marketplace.allCities")}</SelectItem>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={followers} onValueChange={(v) => setFollowers(v as FollowerRange | "all")}>
            <SelectTrigger><SelectValue placeholder={t("marketplace.followers")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("marketplace.allSizes")}</SelectItem>
              {FOLLOWER_RANGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger>
              <SelectValue placeholder={t("marketplace.sortPlaceholder")}>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {SORT_LABELS[sort]}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(["newest", "followers", "alpha"] as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" onClick={() => { setQ(""); setCategory("all"); setCity("all"); setFollowers("all"); setSort("newest"); }}>
              {t("marketplace.clear")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="editorial-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-warm" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
            <p className="font-display text-2xl text-foreground">{t("marketplace.empty")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("marketplace.emptyHint")}</p>
          </div>
        ) : (
          <div className="editorial-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => {
              const isSaved = savedIds.includes(c.id);
              return (
                <div key={c.id} className="group relative">
                  <CreatorCard
                    id={c.id}
                    name={c.display_name}
                    avatar={c.avatar_url}
                    bio={c.bio}
                    category={c.category as Category | null}
                    city={c.city}
                    followerRange={c.follower_range}
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); toggleSave(c.id, isSaved); }}
                    className={`absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full border bg-background/80 backdrop-blur-sm transition-colors ${isSaved ? "border-accent text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-accent" : ""}`} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
