import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/i18n";
import {
  Search,
  Megaphone,
  MapPin,
  Clock,
  Users,
  Briefcase,
  Filter,
  Check,
  X,
  ExternalLink,
  FileText,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageCircle,
  Globe,
  Instagram,
  Smartphone,
  Send,
  Activity,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { InstagramIcon, TelegramIcon } from "@/components/social-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { campaignApplicationSchema } from "@/lib/validation";
import {
  CATEGORIES,
  SOCIAL_PLATFORMS,
  BUDGET_RANGES,
  FOLLOWER_RANGES,
  COMPENSATION_TYPES,
  CITIES,
} from "@/lib/constants";

export const Route = createFileRoute("/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Collabrandly" }] }),
  component: CampaignsPage,
});

type Tab = "browse" | "my-applications";

function formatDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function CampaignsPage() {
  const { user, loading, role, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("browse");

  // Redirect if not logged in
  useState(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  });

  // Filters
  const [platform, setPlatform] = useState("all");
  const [category, setCategory] = useState("all");
  const [budget, setBudget] = useState("all");
  const [location, setLocation] = useState("all");
  const [followers, setFollowers] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQ, setSearchQ] = useState("");

  // Apply dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const appForm = useForm({ resolver: zodResolver(campaignApplicationSchema) });
  const {
    register: aReg,
    handleSubmit: aHandle,
    formState: { errors: aErr, isSubmitting: aSub },
    reset: aReset,
  } = appForm;

  // View details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch all active campaigns (two-step to avoid FK join issues)
  const { data: allCampaigns = [], isLoading: campsLoading } = useQuery({
    queryKey: ["campaigns", "active"],
    enabled: !!user,
    queryFn: async () => {
      const { data: campaigns, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = campaigns ?? [];
      if (rows.length === 0) return [];
      const brandIds = [...new Set(rows.map((c: any) => c.brand_id))];
      const { data: brands } = await supabase
        .from("profiles")
        .select(
          "id, display_name, brand_name, avatar_url, city, email, telegram_url, instagram_url, phone, website",
        )
        .in("id", brandIds);
      const brandMap = new Map((brands ?? []).map((b: any) => [b.id, b]));
      return rows.map((c: any) => ({ ...c, brand: brandMap.get(c.brand_id) }));
    },
  });

  // Fetch applicant counts per campaign
  const { data: applicantCounts = {} } = useQuery({
    queryKey: ["campaign-applicant-counts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_applications").select("campaign_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const app of data ?? []) {
        counts[app.campaign_id] = (counts[app.campaign_id] ?? 0) + 1;
      }
      return counts;
    },
  });

  // Filter & sort in JS (safe — no DB column dependency)
  const campaigns = useMemo(() => {
    let result = [...allCampaigns];
    if (platform !== "all") result = result.filter((c: any) => c.platform === platform);
    if (category !== "all") result = result.filter((c: any) => c.category === category);
    if (budget !== "all") result = result.filter((c: any) => c.budget_range === budget);
    if (location !== "all") result = result.filter((c: any) => c.brand?.city === location);
    if (followers !== "all") result = result.filter((c: any) => c.target_followers === followers);
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(
        (c: any) =>
          c.title.toLowerCase().includes(q) ||
          (c.brand?.display_name ?? "").toLowerCase().includes(q) ||
          (c.brand?.brand_name ?? "").toLowerCase().includes(q),
      );
    }
    if (sortBy === "newest")
      result.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    if (sortBy === "budget_high")
      result.sort((a: any, b: any) => (b.budget_range ?? "").localeCompare(a.budget_range ?? ""));
    if (sortBy === "budget_low")
      result.sort((a: any, b: any) => (a.budget_range ?? "").localeCompare(b.budget_range ?? ""));
    return result;
  }, [allCampaigns, platform, category, budget, location, followers, searchQ, sortBy]);

  // Fetch user's applications (two-step for reliable joining)
  const { data: myApps = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: apps, error } = await supabase
        .from("campaign_applications")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = apps ?? [];
      if (rows.length === 0) return [];
      const campaignIds = [...new Set(rows.map((a: any) => a.campaign_id))];
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .in("id", campaignIds);
      const campaignMap = new Map((campaigns ?? []).map((c: any) => [c.id, c]));
      const brandIds = [...new Set((campaigns ?? []).map((c: any) => c.brand_id).filter(Boolean))];
      const { data: brands } =
        brandIds.length > 0
          ? await supabase
              .from("profiles")
              .select(
                "id, display_name, brand_name, avatar_url, email, telegram_url, instagram_url, phone, website",
              )
              .in("id", brandIds)
          : { data: [] };
      const brandMap = new Map((brands ?? []).map((b: any) => [b.id, b]));
      return rows.map((a: any) => {
        const campaign = campaignMap.get(a.campaign_id);
        return {
          ...a,
          campaign: campaign ? { ...campaign, brand: brandMap.get(campaign.brand_id) } : null,
        };
      });
    },
  });

  const appliedIds = new Set(myApps.map((a: any) => a.campaign_id));

  async function submitApplication(data: { message: string; portfolio?: string }) {
    if (!selectedCampaign || !user) return;
    const { error } = await supabase.from("campaign_applications").insert({
      campaign_id: selectedCampaign.id,
      creator_id: user.id,
      message: data.message,
      portfolio: data.portfolio || null,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505") {
        toast.error(t("campaigns.alreadyApplied"));
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(t("campaigns.applicationSent"));
    setApplyOpen(false);
    setSelectedCampaign(null);
    aReset();
    qc.invalidateQueries({ queryKey: ["my-applications"] });
    qc.invalidateQueries({ queryKey: ["campaign-applicant-counts"] });
  }

  async function withdrawApplication(appId: string) {
    const { error } = await supabase
      .from("campaign_applications")
      .update({ status: "withdrawn" })
      .eq("id", appId)
      .eq("creator_id", user!.id);
    if (error) return toast.error(error.message);
    toast.success(t("campaigns.withdrawn"));
    qc.invalidateQueries({ queryKey: ["my-applications"] });
    qc.invalidateQueries({ queryKey: ["campaign-applicant-counts"] });
  }

  if (loading)
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <PageSkeleton />
        </div>
      </div>
    );
  if (!user) return null;

  const isCreator = role === "creator";

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="border-b border-border/40 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="mr-1 inline h-4 w-4" />
              {t("campaigns.backToDashboard")}
            </Link>
            <h1 className="font-display text-2xl font-semibold">{t("campaigns.title")}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-14">
        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl bg-white p-1 shadow-sm border border-border/40 w-fit overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setTab("browse")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === "browse" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("campaigns.browse")}
          </button>
          <button
            onClick={() => setTab("my-applications")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${tab === "my-applications" ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t("campaigns.myApplications")}
            {myApps.filter((a: any) => a.status === "pending" || a.status === "viewed").length >
              0 && (
              <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px]">
                {myApps.filter((a: any) => a.status === "pending" || a.status === "viewed").length}
              </span>
            )}
          </button>
        </div>

        {tab === "browse" && (
          <>
            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 sm:flex sm:gap-3 rounded-2xl border border-border/40 bg-white p-4 shadow-sm">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("campaigns.searchPlaceholder")}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  className="w-full rounded-xl pl-9"
                />
              </div>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                  <SelectValue placeholder={t("campaigns.allPlatforms")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("campaigns.allPlatforms")}</SelectItem>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                  <SelectValue placeholder={t("campaigns.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("campaigns.allCategories")}</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`category.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="w-full sm:w-[150px] rounded-xl">
                  <SelectValue placeholder={t("campaigns.allBudgets")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("campaigns.allBudgets")}</SelectItem>
                  {BUDGET_RANGES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {CITIES.length > 0 && (
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                    <SelectValue placeholder={t("campaigns.allLocations")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("campaigns.allLocations")}</SelectItem>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={followers} onValueChange={setFollowers}>
                <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
                  <SelectValue placeholder={t("campaigns.allFollowers")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("campaigns.allFollowers")}</SelectItem>
                  {FOLLOWER_RANGES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[150px] rounded-xl">
                  <SelectValue placeholder={t("campaigns.sortBy")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t("campaigns.sortNewest")}</SelectItem>
                  <SelectItem value="budget_high">{t("campaigns.sortBudgetHigh")}</SelectItem>
                  <SelectItem value="budget_low">{t("campaigns.sortBudgetLow")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            {!campsLoading && (
              <p className="mb-4 text-xs text-muted-foreground">
                {t("campaigns.foundCount", { count: campaigns.length })}
              </p>
            )}

            {/* Campaign cards */}
            {campsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-56 animate-pulse rounded-2xl bg-white/60 border border-border/40"
                  />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-white p-16 text-center shadow-sm">
                <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-4 font-display text-xl text-foreground">
                  {t("campaigns.noCampaigns")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {campaigns.map((c: any) => {
                  const brandName = c.brand?.brand_name || c.brand?.display_name || "Brand";
                  const isExpanded = expandedId === c.id;
                  const applicantCount = applicantCounts[c.id] ?? 0;
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border/60 bg-white p-4 sm:p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Header — brand info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary/20">
                            {c.brand?.avatar_url ? (
                              <img
                                src={c.brand.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="grid h-full place-items-center text-sm font-medium text-muted-foreground/30">
                                {(brandName[0] ?? "B").toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-display text-lg font-semibold leading-tight">
                              {c.title}
                            </p>
                            <p className="text-xs text-muted-foreground">{brandName}</p>
                          </div>
                        </div>
                        {c.budget_range && (
                          <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                            {c.budget_range}
                          </span>
                        )}
                      </div>

                      {/* Tags row */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        {c.platform && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            {c.platform}
                          </span>
                        )}
                        {c.category && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            {t(`category.${c.category}`)}
                          </span>
                        )}
                        {c.compensation_type && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            {t(`compensation.${c.compensation_type}`)}
                          </span>
                        )}
                        {c.deadline && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            <Calendar className="mr-0.5 inline h-3 w-3" />
                            {t("campaigns.until")} {c.deadline}
                          </span>
                        )}
                        {c.target_followers && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            <Users className="mr-0.5 inline h-3 w-3" />
                            {t("campaigns.from")} {c.target_followers}
                          </span>
                        )}
                        {c.engagement_rate && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            <Activity className="mr-0.5 inline h-3 w-3" />
                            {c.engagement_rate}
                          </span>
                        )}
                        {c.brand?.city && (
                          <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                            <MapPin className="mr-0.5 inline h-3 w-3" />
                            {c.brand.city}
                          </span>
                        )}
                      </div>

                      {/* Brief */}
                      {c.brief && (
                        <p
                          className={`mt-3 text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}
                        >
                          {c.brief}
                        </p>
                      )}

                      {/* Expanded details */}
                      {isExpanded && c.deliverables && (
                        <div className="mt-3 rounded-2xl bg-[#FAF8F5] p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">
                            {t("campaigns.deliverables")}
                          </p>
                          <p className="text-xs text-muted-foreground/80 whitespace-pre-wrap">
                            {c.deliverables}
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                          <span>
                            <Calendar className="mr-1 inline h-3 w-3" />
                            {formatDate(c.created_at)}
                          </span>
                          {applicantCount > 0 && (
                            <span>
                              <Users className="mr-1 inline h-3 w-3" />
                              {t("campaigns.applicantCount", { count: applicantCount })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1">
                              {isExpanded ? t("campaigns.hideDetails") : t("campaigns.viewDetails")}
                            </span>
                          </button>
                          {isCreator &&
                            (appliedIds.has(c.id) ? (
                              <Badge variant="secondary" className="rounded-xl text-[10px]">
                                {t("campaigns.applied")}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="accent"
                                className="h-7 rounded-xl text-xs"
                                onClick={() => {
                                  if (
                                    profile?.verification_status !== "approved" &&
                                    profile?.verification_status !== "active"
                                  ) {
                                    toast.error(t("campaigns.approvalRequired"));
                                    return;
                                  }
                                  setSelectedCampaign(c);
                                  aReset();
                                  setApplyOpen(true);
                                }}
                              >
                                {t("campaigns.apply")}
                              </Button>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "my-applications" && (
          <div className="space-y-3">
            {myApps.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/60 bg-white p-16 text-center shadow-sm">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-4 font-display text-xl text-foreground">
                  {t("campaigns.noApplications")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("campaigns.noApplicationsHint")}
                </p>
                <Button
                  variant="accent"
                  className="mt-4 rounded-2xl"
                  onClick={() => setTab("browse")}
                >
                  {t("campaigns.browse")}
                </Button>
              </div>
            ) : (
              myApps.map((app: any) => {
                const camp = app.campaign;
                const brandName = camp?.brand?.brand_name || camp?.brand?.display_name || "Brand";
                return (
                  <div
                    key={app.id}
                    className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary/20">
                          {camp?.brand?.avatar_url ? (
                            <img
                              src={camp.brand.avatar_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-sm font-medium text-muted-foreground/30">
                              {(brandName[0] ?? "B").toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-display text-lg font-semibold">
                            {camp?.title ?? t("campaigns.deletedCampaign")}
                          </p>
                          <p className="text-xs text-muted-foreground">{brandName}</p>
                        </div>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>

                    {app.message && (
                      <p className="mt-2 text-sm italic text-muted-foreground/70">
                        "{app.message}"
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      {camp?.budget_range && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">
                          <DollarSign className="mr-0.5 inline h-3 w-3" />
                          {camp.budget_range}
                        </span>
                      )}
                      {camp?.platform && (
                        <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                          {camp.platform}
                        </span>
                      )}
                      {camp?.deadline && (
                        <span className="rounded-full bg-secondary/50 px-2 py-0.5">
                          <Calendar className="mr-0.5 inline h-3 w-3" />
                          {t("campaigns.until")} {camp.deadline}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground/50">
                        {formatDate(app.created_at)}
                      </p>
                      <div className="flex items-center gap-2">
                        {app.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-xl text-xs text-destructive border-destructive/40"
                            onClick={() => withdrawApplication(app.id)}
                          >
                            <X className="mr-1 h-3 w-3" />
                            {t("campaigns.withdraw")}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Contact reveal on acceptance — BOTH parties */}
                    {app.status === "accepted" && (
                      <div className="mt-3 rounded-2xl bg-success/5 border border-success/20 p-3">
                        <p className="text-xs font-semibold text-success mb-2">
                          {t("campaigns.contactRevealed")}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                          {camp?.brand?.id && (
                            <button
                              onClick={async () => {
                                const { data: existing } = await supabase
                                  .from("messages")
                                  .select("id")
                                  .or(
                                    `and(sender_id.eq.${user!.id},recipient_id.eq.${camp.brand.id}),and(sender_id.eq.${camp.brand.id},recipient_id.eq.${user!.id})`,
                                  )
                                  .limit(1);
                                if (!existing?.length) {
                                  await supabase.from("messages").insert({
                                    sender_id: user!.id,
                                    recipient_id: camp.brand.id,
                                    body: t("creator.collabMessageIntro", {
                                      brand:
                                        camp.brand?.brand_name || camp.brand?.display_name || "",
                                    }),
                                  });
                                }
                                navigate({
                                  to: "/creator",
                                  search: { page: "messages", chat: camp.brand.id },
                                });
                              }}
                              className="flex items-center gap-1 text-accent hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" /> {t("creator.collabMessageBtn")}
                            </button>
                          )}
                          {camp?.brand?.email && (
                            <a
                              href={`mailto:${camp.brand.email}`}
                              className="flex items-center gap-1 text-accent hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {camp.brand.email}
                            </a>
                          )}
                          {camp?.brand?.telegram_url && (
                            <a
                              href={camp.brand.telegram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-accent transition-all duration-150 hover:scale-105 hover:shadow-sm hover:cursor-pointer"
                              title="Open Telegram"
                            >
                              <TelegramIcon className="h-[18px] w-[18px] shrink-0" />
                              <span>Telegram</span>
                            </a>
                          )}
                          {camp?.brand?.instagram_url && (
                            <a
                              href={camp.brand.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-accent transition-all duration-150 hover:scale-105 hover:shadow-sm hover:cursor-pointer"
                              title="Open Instagram"
                            >
                              <InstagramIcon className="h-[18px] w-[18px] shrink-0" />
                              <span>Instagram</span>
                            </a>
                          )}
                          {camp?.brand?.phone && (
                            <a
                              href={`tel:${camp.brand.phone}`}
                              className="flex items-center gap-1 text-accent hover:underline"
                            >
                              <Smartphone className="h-3 w-3" />
                              {camp.brand.phone}
                            </a>
                          )}
                          {camp?.brand?.website && (
                            <a
                              href={camp.brand.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-accent hover:underline"
                            >
                              <Globe className="h-3 w-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Apply Dialog */}
      <Dialog
        open={applyOpen}
        onOpenChange={(o) => {
          setApplyOpen(o);
          if (!o) {
            setSelectedCampaign(null);
            aReset();
          }
        }}
      >
        <DialogContent className="mx-4 sm:mx-auto sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("campaigns.applyTo")}</DialogTitle>
            {selectedCampaign && (
              <DialogDescription className="font-display text-lg font-semibold text-foreground">
                {selectedCampaign.title}
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={aHandle(submitApplication)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("campaigns.applicationMessage")}</Label>
              <Textarea
                rows={4}
                {...aReg("message")}
                className="rounded-xl"
                placeholder={t("campaigns.applicationMessagePlaceholder")}
              />
              {aErr.message && (
                <p className="text-xs text-destructive">{aErr.message.message as string}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                {t("campaigns.portfolio")}{" "}
                <span className="text-muted-foreground/50">{t("campaigns.optional")}</span>
              </Label>
              <Input
                {...aReg("portfolio")}
                className="rounded-xl"
                placeholder={t("campaigns.portfolioPlaceholder")}
              />
            </div>
            <Button type="submit" variant="accent" className="w-full rounded-2xl" disabled={aSub}>
              {aSub ? "..." : t("campaigns.sendApplication")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: t("campaigns.statusPending"), cls: "bg-secondary text-muted-foreground" },
    viewed: {
      label: t("campaigns.statusViewed"),
      cls: "bg-blue-50 text-blue-600 border border-blue-200",
    },
    accepted: {
      label: t("campaigns.statusAccepted"),
      cls: "bg-success/10 text-success border border-success/30",
    },
    rejected: { label: t("campaigns.statusRejected"), cls: "bg-destructive/10 text-destructive" },
    withdrawn: { label: t("campaigns.statusWithdrawn"), cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
