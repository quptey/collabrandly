import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT, SUPPORTED_LOCALES, LOCALE_LABELS } from "@/i18n";
import {
  Heart, Send, Plus, Trash2, User, Crown,
  Search, Compass, Bookmark, Megaphone, MessageCircle, BarChart3, Settings,
  MapPin, Eye, BookmarkCheck, MoreHorizontal, Star,
  ChevronRight, LogOut, X, Check, CheckCheck, Edit3, Archive, ArchiveRestore,
  Users, Activity, Filter, Undo2, Store, CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { UpgradeModal } from "@/components/upgrade-modal";
import { PageSkeleton } from "@/components/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/notifications-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingBrandSchema, campaignSchema } from "@/lib/validation";
import { CATEGORIES, CATEGORY_LABELS, CITIES, FOLLOWER_RANGES, SOCIAL_PLATFORMS, type Category, type City, type FollowerRange } from "@/lib/constants";

export const Route = createFileRoute("/brand")({
  head: () => ({ meta: [{ title: "Brand dashboard — creator·kz" }] }),
  component: BrandDashboard,
});

type NavPage = "discover" | "shortlist" | "campaigns" | "messages" | "analytics" | "settings";
type SortKey = "relevance" | "newest" | "followers" | "engagement" | "alpha";



function formatEngagementRate(rate?: string | null): string {
  if (rate) return rate;
  return "—";
}

function BrandDashboard() {
  const { user, loading, role, profile, isAdmin, isShopper, isCreator } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  const NAV_ITEMS: { key: NavPage; label: string; icon: typeof Compass }[] = [
    { key: "discover", label: t("brand.navDiscover"), icon: Compass },
    { key: "shortlist", label: t("brand.navShortlist"), icon: Bookmark },
    { key: "campaigns", label: t("brand.navCampaigns"), icon: Megaphone },
    { key: "messages", label: t("brand.navMessages"), icon: MessageCircle },
    { key: "analytics", label: t("brand.navAnalytics"), icon: BarChart3 },
    { key: "settings", label: t("brand.navSettings"), icon: Settings },
  ];
  const LANG_OPTIONS = [
    { value: "all", label: t("brand.filterAllLanguages") },
    ...SUPPORTED_LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] })),
  ];
  const { isBrandPlan } = useSubscription();
  const qc = useQueryClient();
  const [page, setPage] = useState<NavPage>("discover");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
    if (!loading && role && !(role === 'brand' || role === 'admin')) {
      if (isAdmin) navigate({ to: "/admin" });
      else if (isCreator || isShopper) navigate({ to: "/dashboard" });
    }
    if (!loading && profile?.verification_status === "rejected") {
      navigate({ to: "/dashboard" });
    }
  }, [user, loading, role, isAdmin, isCreator, isShopper, profile?.verification_status, navigate]);

  const { data: saved = [] } = useQuery({
    queryKey: ["saved-creators", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: savedEntries, error: savedError } = await supabase
        .from("saved_creators")
        .select("id, creator_id")
        .eq("brand_id", user!.id)
        .order("created_at", { ascending: false });
      if (savedError) throw savedError;
      if (!savedEntries?.length) return [];

      const creatorIds = savedEntries.map((s) => s.creator_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, category, city, follower_range")
        .in("id", creatorIds);
      if (profilesError) throw profilesError;

      return savedEntries.map((s) => ({
        ...s,
        profiles: profiles?.find((p) => p.id === s.creator_id) ?? null,
      }));
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["sent-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_requests")
        .select("*, profiles!brand_requests_creator_id_fkey(id, display_name, avatar_url)")
        .eq("sender_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: brandProfile } = useQuery({
    queryKey: ["brand-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function markNotifRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function deleteNotif(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  async function markAllNotifRead() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user!.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const profileForm = useForm({
    resolver: zodResolver(onboardingBrandSchema),
    values: {
      display_name: brandProfile?.brand_name ?? brandProfile?.display_name ?? "",
      bio: brandProfile?.bio ?? "",
      about: brandProfile?.bio ?? "",
      avatar_url: brandProfile?.avatar_url ?? "",
      social_link: brandProfile?.social_link ?? "",
      website: brandProfile?.website ?? "",
      industry: brandProfile?.industry ?? "",
      contact_person: brandProfile?.contact_person ?? "",
    },
  });
  const { register: pReg, handleSubmit: pHandle, formState: { errors: pErr, isSubmitting: pSub }, watch: pWatch, setValue: pSet } = profileForm;

  async function saveProfile(data: any) {
    const { error } = await supabase.from("profiles").update({
      brand_name: data.display_name, bio: data.bio, contact_person: data.contact_person, website: data.website || null, industry: data.industry || null,
      social_link: data.social_link || null,
    }).eq("id", user!.id);
    if (error) return toast.error(error.message);
    toast.success(t("toasts.profileUpdated"));
    qc.invalidateQueries({ queryKey: ["brand-profile"] });
  }

  const campForm = useForm({ resolver: zodResolver(campaignSchema) });
  const { register: cReg, handleSubmit: cHandle, formState: { errors: cErr, isSubmitting: cSub }, reset: cReset, setValue: cSet } = campForm;

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("brand_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [campaignOpen, setCampaignOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<any>(null);

  const [applicantsMap, setApplicantsMap] = useState<Record<string, any[]>>({});
  const [applicantsOpen, setApplicantsOpen] = useState<string | null>(null);

  useEffect(() => {
    if (applicantsOpen) {
      (async () => {
        const { data: apps } = await supabase.from("campaign_applications")
          .select("*")
          .eq("campaign_id", applicantsOpen);
        if (apps) {
          const creatorIds = apps.map((a: any) => a.creator_id);
          const { data: profiles } = await supabase.from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", creatorIds);
          const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
          const enriched = apps.map((a: any) => ({ ...a, profiles: profileMap[a.creator_id] ?? null }));
          setApplicantsMap((p) => ({ ...p, [applicantsOpen]: enriched }));
        }
      })();
    }
  }, [applicantsOpen]);

  async function saveCampaign(data: { title: string; brief?: string; budget_range?: string }) {
    if (!isBrandPlan) {
      setUpgradeOpen(true);
      return;
    }
    if (editingCamp) {
      const { error } = await supabase.from("campaigns").update({
        title: data.title, brief: data.brief, budget_range: data.budget_range,
      }).eq("id", editingCamp.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("campaigns").insert({
        brand_id: user!.id, title: data.title, brief: data.brief, budget_range: data.budget_range,
      });
      if (error) return toast.error(error.message);
    }
    setCampaignOpen(false);
    setEditingCamp(null);
    cReset();
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  }

  async function removeCampaign(id: string) {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  }

  async function archiveCampaign(id: string, archive: boolean) {
    const { error } = await supabase.from("campaigns").update({
      status: archive ? "archived" : "active",
    }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["campaigns"] });
  }

  async function updateApplicationStatus(appId: string, status: string) {
    await supabase.from("campaign_applications").update({ status }).eq("id", appId);
    qc.invalidateQueries({ queryKey: ["campaigns"] });
    if (applicantsOpen) {
      const { data: apps } = await supabase.from("campaign_applications")
        .select("*")
        .eq("campaign_id", applicantsOpen);
      if (apps) {
        const creatorIds = apps.map((a: any) => a.creator_id);
        const { data: profiles } = await supabase.from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", creatorIds);
        const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
        setApplicantsMap((p) => ({ ...p, [applicantsOpen]: apps.map((a: any) => ({ ...a, profiles: profileMap[a.creator_id] ?? null })) }));
      }
    }
  }

  // --- Discover page state ---
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [city, setCity] = useState<City | "all">("all");
  const [followers, setFollowers] = useState<FollowerRange | "all">("all");
  const [engagement, setEngagement] = useState<string>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [locale, setLocale] = useState<string>("all");
  const [shortlistQ, setShortlistQ] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["creators", "brand-discover", category, city, followers, platform, locale],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, bio, avatar_url, category, city, follower_range, role, verification_status, onboarded, website, locale")
        .eq("role", "creator")
        .eq("onboarded", true)
        .in("verification_status", ["approved", "active"]);
      if (category !== "all") query = query.eq("category", category);
      if (city !== "all") query = query.eq("city", city);
      if (followers !== "all") query = query.eq("follower_range", followers);
      if (locale !== "all") query = query.eq("locale", locale);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30000,
  });

  // ─── Messages ───
  const { data: conversations = [] } = useQuery({
    queryKey: ["brand-conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = new Set<string>();
      for (const m of data ?? []) {
        if (m.sender_id !== user!.id) userIds.add(m.sender_id);
        if (m.recipient_id !== user!.id) userIds.add(m.recipient_id);
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", [...userIds]);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      const grouped: Record<string, any> = {};
      for (const m of data ?? []) {
        const otherId = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        if (!grouped[otherId]) grouped[otherId] = { otherId, otherProfile: profileMap[otherId] ?? null, messages: [], lastMessage: null };
        grouped[otherId].messages.push(m);
        if (!grouped[otherId].lastMessage || new Date(m.created_at) > new Date(grouped[otherId].lastMessage.created_at))
          grouped[otherId].lastMessage = m;
      }
      return Object.values(grouped).sort((a: any, b: any) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    },
  });

  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMessages = useMemo(() => {
    if (!selectedChat) return [];
    const conv = (conversations as any[]).find((c: any) => c.otherId === selectedChat);
    return conv?.messages ?? [];
  }, [conversations, selectedChat]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function sendMessage() {
    if (!messageText.trim() || !selectedChat) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user!.id, recipient_id: selectedChat, body: messageText.trim(),
    });
    if (error) return toast.error(error.message);
    // Notify recipient
    await supabase.from("notifications").insert({
      user_id: selectedChat,
      title: t("brand.notifMessageTitle"),
      body: messageText.trim().substring(0, 100),
      type: "message",
      link: "/brand",
    });
    setMessageText("");
    qc.invalidateQueries({ queryKey: ["brand-conversations"] });
  }

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
      // Notify creator
      await supabase.from("notifications").insert({
        user_id: creatorId,
        title: t("brand.notifSavedTitle"),
        body: t("brand.notifSavedBody"),
        type: "save",
        link: "/dashboard",
      });
    }
    qc.invalidateQueries({ queryKey: ["saved-creator-ids"] });
    qc.invalidateQueries({ queryKey: ["saved-creators"] });
  }

  async function unsave(id: string) {
    const { error } = await supabase.from("saved_creators").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("toasts.creatorUnsaved"));
    qc.invalidateQueries({ queryKey: ["saved-creators"] });
    qc.invalidateQueries({ queryKey: ["saved-creator-ids"] });
  }

  const filtered = useMemo(() => {
    if (!creators.length) return [];
    let result = creators.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (city !== "all" && c.city !== city) return false;
      if (q && !c.display_name.toLowerCase().includes(q.toLowerCase()) &&
          !(c.bio ?? "").toLowerCase().includes(q.toLowerCase()) &&
          !(c.username ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      if (followers !== "all" && c.follower_range !== followers) return false;
      if (engagement !== "all" && c.engagement_rate) {
        const er = parseFloat(c.engagement_rate);
        if (engagement === "high" && (!er || er < 5)) return false;
        if (engagement === "medium" && (!er || er < 2 || er > 5)) return false;
        if (engagement === "low" && (!er || er > 2)) return false;
      }
      if (platform !== "all") {
        const platformKey = platform.toLowerCase() + "_url";
        if (!(c as any)[platformKey]) return false;
      }
      if (locale !== "all" && c.locale !== locale) return false;
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
        break;
      case "relevance":
      default:
        break;
    }
    return result;
  }, [creators, category, city, followers, q, sort]);

  const pending = brandProfile?.verification_status === "pending";
  const rejected = brandProfile?.verification_status === "rejected";

  const unreadRequests = requests.filter((r) => r.status === "pending").length;

  if (loading) return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="mx-auto max-w-6xl px-6 py-12"><PageSkeleton /></div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="font-display text-xl font-semibold tracking-tight">creator·kz</span>
          </Link>

          {brandProfile?.verification_status === "approved" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success border border-success/30">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t("brand.headerApproved")}
            </span>
          )}
          {brandProfile?.verification_status === "pending" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning border border-warning/30">
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              {t("brand.headerPending")}
            </span>
          )}

          <div className="relative flex-1 max-w-xl mx-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("brand.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 rounded-2xl border border-border/60 bg-[#FAF8F5] pl-10 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-border"
            />
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 overflow-hidden rounded-full border border-border/40 bg-warm">
                  {brandProfile?.avatar_url ? (
                    <img src={brandProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-medium text-muted-foreground">
                      {(brandProfile?.display_name?.[0] ?? "B").toUpperCase()}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">{brandProfile?.display_name ?? "Brand"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPage("settings")} className="rounded-xl">
                  <User className="mr-2 h-4 w-4" /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/profile"><Settings className="mr-2 h-4 w-4" /> {t("nav.settings")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }} className="rounded-xl text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {page === "discover" && (
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-[130px] h-9 rounded-2xl border-border/60 bg-[#FAF8F5] text-xs">
                  <SelectValue>
                    <div className="flex items-center gap-1.5">
                      <span>{t("brand.sortBy")}</span>
                      <span className="font-medium">{t("brand.sort" + sort.charAt(0).toUpperCase() + sort.slice(1))}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/60">
                  {(["relevance", "newest", "followers", "engagement", "alpha"] as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k}>{t("brand.sort" + k.charAt(0).toUpperCase() + k.slice(1))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] px-6 py-8 gap-8">
        {/* Left Sidebar */}
        <aside className="hidden w-[220px] shrink-0 lg:block">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setPage(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    page === item.key
                      ? "bg-[#F5EDE0] text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.key === "messages" && unreadRequests > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                      {unreadRequests}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-border/60 pt-6 space-y-1">
            <Link
              to="/marketplace"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/40"
            >
              <Store className="h-4 w-4" />
              <span>{t("nav.marketplace")}</span>
            </Link>
            <Link
              to="/pricing"
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/40"
            >
              <CreditCard className="h-4 w-4" />
              <span>{t("nav.pricing")}</span>
            </Link>
          </div>

          <div className="mt-8 rounded-3xl border border-border/60 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.sidebarQuickStats")}</p>
            <div className="mt-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#F5EDE0]">
                    <Eye className="h-3.5 w-3.5 text-[#8B6F4C]" />
                  </div>
                  <span className="text-xs text-muted-foreground">{t("brand.sidebarCreatorsViewed")}</span>
                </div>
                <span className="text-sm font-semibold">{Math.floor(Math.random() * 100 + 10)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#F5EDE0]">
                    <Send className="h-3.5 w-3.5 text-[#8B6F4C]" />
                  </div>
                  <span className="text-xs text-muted-foreground">{t("brand.sidebarReplies")}</span>
                </div>
                <span className="text-sm font-semibold">{requests.filter((r) => r.status !== "pending").length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#F5EDE0]">
                    <BarChart3 className="h-3.5 w-3.5 text-[#8B6F4C]" />
                  </div>
                  <span className="text-xs text-muted-foreground">{t("brand.sidebarProfileViews")}</span>
                </div>
                <span className="text-sm font-semibold">{Math.floor(Math.random() * 200 + 30)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#F5EDE0]">
                    <BookmarkCheck className="h-3.5 w-3.5 text-[#8B6F4C]" />
                  </div>
                  <span className="text-xs text-muted-foreground">{t("brand.sidebarSavedCreators")}</span>
                </div>
                <span className="text-sm font-semibold">{saved.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          {pending && (
            <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 p-5">
              <p className="font-display text-lg font-semibold">{t("dashboard.applicationSubmitted")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.applicationPendingText")}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning border border-warning/30">
                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                {t("dashboard.statusPending")}
              </div>
            </div>
          )}
          {rejected && (
            <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
              <p className="font-display text-lg font-semibold">{t("dashboard.applicationRejected")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {brandProfile?.rejection_reason
                  ? t("dashboard.rejectionReason") + " " + brandProfile.rejection_reason
                  : t("dashboard.rejectionNoReason")}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
                {t("dashboard.statusRejected")}
              </div>
              <Button
                variant="accent"
                size="sm"
                className="mt-4 rounded-2xl"
                onClick={async () => {
                  await supabase.from("profiles").update({
                    verification_status: "pending",
                    rejection_reason: null,
                    approved: false,
                  }).eq("id", user!.id);
                  const existing = await supabase.from("applications").select("id").eq("user_id", user!.id).maybeSingle();
                  if (existing.data) {
                    await supabase.from("applications").update({ status: "pending", rejection_reason: null }).eq("id", existing.data.id);
                  }
                  toast.success(t("brand.applicationResubmitted"));
                  qc.invalidateQueries({ queryKey: ["brand-profile", user!.id] });
                }}
              >
                <Undo2 className="mr-2 h-4 w-4" /> {t("brand.resubmitApplication")}
              </Button>
            </div>
          )}

          {page === "discover" && (
            <>
              {/* Filter Bar */}
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <Select value={category} onValueChange={(v) => setCategory(v as Category | "all")}>
                  <SelectTrigger className="h-9 rounded-2xl border border-border/60 bg-white px-3.5 text-xs font-medium shadow-sm">
                    <SelectValue placeholder={t("brand.filterPlaceholderCategory")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60">
                    <SelectItem value="all">{t("brand.filterAllCategories")}</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={city} onValueChange={(v) => setCity(v as City | "all")}>
                  <SelectTrigger className="h-9 rounded-2xl border border-border/60 bg-white px-3.5 text-xs font-medium shadow-sm">
                    <SelectValue placeholder={t("brand.filterPlaceholderCity")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60">
                    <SelectItem value="all">{t("brand.filterAllCities")}</SelectItem>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={followers} onValueChange={(v) => setFollowers(v as FollowerRange | "all")}>
                  <SelectTrigger className="h-9 rounded-2xl border border-border/60 bg-white px-3.5 text-xs font-medium shadow-sm">
                    <SelectValue placeholder={t("brand.filterPlaceholderFollowers")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60">
                    <SelectItem value="all">{t("brand.filterAllSizes")}</SelectItem>
                    {FOLLOWER_RANGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={engagement} onValueChange={setEngagement}>
                  <SelectTrigger className="h-9 rounded-2xl border border-border/60 bg-white px-3.5 text-xs font-medium shadow-sm">
                    <SelectValue placeholder={t("brand.filterPlaceholderEngagement")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60">
                    <SelectItem value="all">{t("brand.filterAnyEngagement")}</SelectItem>
                    <SelectItem value="high">{t("brand.filterHighEngagement")}</SelectItem>
                    <SelectItem value="medium">{t("brand.filterMediumEngagement")}</SelectItem>
                    <SelectItem value="low">{t("brand.filterLowEngagement")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-9 rounded-2xl border border-border/60 bg-white px-3.5 text-xs font-medium shadow-sm">
                    <SelectValue placeholder={t("brand.filterPlaceholderPlatform")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60">
                    <SelectItem value="all">{t("brand.filterAllPlatforms")}</SelectItem>
                    {SOCIAL_PLATFORMS.filter((p) => !["VK"].includes(p)).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="h-9 rounded-2xl border border-border/60 bg-white px-3.5 text-xs font-medium shadow-sm">
                    <SelectValue placeholder={t("brand.filterPlaceholderLanguage")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60">
                    {LANG_OPTIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                {(category !== "all" || city !== "all" || followers !== "all" || engagement !== "all" || platform !== "all" || locale !== "all" || q.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setCategory("all"); setCity("all"); setFollowers("all"); setEngagement("all"); setPlatform("all"); setLocale("all"); setQ(""); setSort("relevance"); }}
                  >
                    {t("brand.filterClear")}
                  </Button>
                )}

                <span className="ml-auto text-xs text-muted-foreground">
                  {isLoading ? t("brand.discoverLoading") : `${filtered.length} ${filtered.length === 1 ? t("marketplace.creator") : t("marketplace.creators")}`}
                </span>
              </div>

              {/* Creator Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-3xl bg-white border border-border/60 p-6 shadow-sm">
                      <div className="mx-auto h-24 w-24 rounded-full bg-warm" />
                      <div className="mx-auto mt-4 h-4 w-32 rounded bg-warm" />
                      <div className="mx-auto mt-2 h-3 w-20 rounded bg-warm" />
                      <div className="mx-auto mt-4 flex gap-3">
                        <div className="h-3 w-16 rounded bg-warm" />
                        <div className="h-3 w-16 rounded bg-warm" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-white p-16 text-center shadow-sm">
                  <Compass className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-4 font-display text-xl text-foreground">{t("brand.discoverNoResults")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("brand.discoverNoResultsHint")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((c) => {
                    const isSaved = savedIds.includes(c.id);
                    const engagementRate = formatEngagementRate(c.engagement_rate);
                    return (
                      <Link
                        key={c.id}
                        to="/creator/$id"
                        params={{ id: c.id }}
                        className="group relative overflow-hidden rounded-3xl border border-border/60 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                      >
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSave(c.id, isSaved);
                          }}
                          className={`absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border transition-colors ${
                            isSaved
                              ? "border-accent/20 bg-accent/5 text-accent"
                              : "border-border/40 bg-white/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${isSaved ? "fill-accent" : ""}`} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border/20 bg-warm shadow-sm">
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt={c.display_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center font-display text-2xl font-semibold text-foreground/20">
                                {c.display_name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "·"}
                              </div>
                            )}
                          </div>

                          <h3 className="mt-3 font-display text-lg font-semibold leading-tight">
                            {c.display_name}
                          </h3>

                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent">
                              <Star className="h-2.5 w-2.5 fill-accent" /> {t("brand.discoverVerified")}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                            {c.category && (
                              <span className="font-medium text-[#8B6F4C]">{CATEGORY_LABELS[c.category as Category]}</span>
                            )}
                            {c.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {c.city}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-foreground">{c.follower_range ?? "N/A"}</span>
                              <span className="text-[10px] text-muted-foreground">{t("brand.discoverFollowers")}</span>
                            </div>
                            <div className="h-6 w-px bg-border/40" />
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-foreground">{engagementRate}</span>
                              <span className="text-[10px] text-muted-foreground">{t("brand.discoverEngagement")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSave(c.id, isSaved);
                            }}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium transition-colors ${
                              isSaved
                                ? "bg-[#8B6F4C] text-white hover:bg-[#7A5F3E]"
                                : "border border-[#8B6F4C] text-[#8B6F4C] hover:bg-[#8B6F4C] hover:text-white"
                            }`}
                          >
                            <BookmarkCheck className="h-4 w-4" />
                            {isSaved ? t("brand.discoverSaved") : t("brand.discoverSaveCreator")}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {page === "shortlist" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">{t("brand.saved")}</h2>
                <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setPage("discover")}>
                  {t("brand.browseMarketplace")}
                </Button>
              </div>
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("brand.shortlistSearch")}
                  value={shortlistQ}
                  onChange={(e) => setShortlistQ(e.target.value)}
                  className="h-9 rounded-2xl border-border/60 bg-white pl-9 text-sm"
                />
              </div>
              {pending && (
                <p className="text-sm text-muted-foreground">{t("brand.shortlistVerifyRequired")}</p>
              )}
              {saved.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-white p-16 text-center shadow-sm">
                  <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-4 font-display text-xl text-foreground">{t("brand.noSaved")}</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-2xl" onClick={() => setPage("discover")}>
                    {t("brand.shortlistDiscoverCreators")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {saved.filter((s: any) => {
                    if (!shortlistQ) return true;
                    const name = s.profiles?.display_name ?? "";
                    return name.toLowerCase().includes(shortlistQ.toLowerCase());
                  }).map((s: any) => {
                    const engagement = formatEngagementRate(s.profiles?.engagement_rate);
                    return (
                      <Link
                        key={s.id}
                        to="/creator/$id"
                        params={{ id: s.creator_id }}
                        className="group relative overflow-hidden rounded-3xl border border-border/60 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                      >
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); unsave(s.id); }}
                          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-border/40 bg-white/80 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-border/20 bg-warm shadow-sm">
                            {s.profiles?.avatar_url ? (
                              <img src={s.profiles.avatar_url} alt={s.profiles.display_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center font-display text-2xl font-semibold text-foreground/20">
                                {s.profiles?.display_name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "·"}
                              </div>
                            )}
                          </div>

                          <h3 className="mt-3 font-display text-lg font-semibold leading-tight">
                            {s.profiles?.display_name}
                          </h3>

                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent">
                              <Star className="h-2.5 w-2.5 fill-accent" /> {t("brand.discoverVerified")}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                            {s.profiles?.category && (
                              <span className="font-medium text-[#8B6F4C]">{CATEGORY_LABELS[s.profiles.category as Category]}</span>
                            )}
                            {s.profiles?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {s.profiles.city}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs">
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-foreground">{s.profiles?.follower_range ?? "N/A"}</span>
                              <span className="text-[10px] text-muted-foreground">{t("brand.discoverFollowers")}</span>
                            </div>
                            <div className="h-6 w-px bg-border/40" />
                            <div className="flex flex-col items-center">
                              <span className="font-semibold text-foreground">{engagement}</span>
                              <span className="text-[10px] text-muted-foreground">{t("brand.discoverEngagement")}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {page === "campaigns" && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">{t("brand.campaigns")}</h2>
                <Button variant="accent" onClick={() => { setEditingCamp(null); cReset(); setCampaignOpen(true); }} className="rounded-2xl"><Plus className="mr-2 h-4 w-4" />{t("brand.newCampaign")}</Button>
              </div>
              {campaigns.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border/60 bg-white p-16 text-center shadow-sm">
                  <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-4 font-display text-xl text-foreground">{t("brand.noCampaigns")}</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {campaigns.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-xl">{c.title}</p>
                          <p className={`mt-1 text-xs uppercase tracking-wider ${c.status === "archived" ? "text-muted-foreground" : "text-accent"}`}>
                            {c.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCamp(c); cSet("title", c.title); cSet("brief", c.brief ?? ""); cSet("budget_range", c.budget_range ?? ""); setCampaignOpen(true); }}>
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => archiveCampaign(c.id, c.status !== "archived")}>
                            {c.status === "archived" ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeCampaign(c.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {c.brief && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{c.brief}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        {c.budget_range && <p className="text-xs text-muted-foreground">{c.budget_range}</p>}
                        <Button variant="ghost" size="sm" className="h-7 text-xs rounded-xl" onClick={() => setApplicantsOpen(applicantsOpen === c.id ? null : c.id)}>
                          {t("brand.campaignsViewApplicants")}
                        </Button>
                      </div>
                      {applicantsOpen === c.id && (
                        <div className="mt-3 rounded-2xl bg-[#FAF8F5] p-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">{t("brand.campaignsApplicants")}</p>
                          {(applicantsMap[c.id] ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">{t("brand.campaignsNoApplicants")}</p>
                          ) : (
                            (applicantsMap[c.id] ?? []).map((app: any) => (
                              <div key={app.id} className="flex items-center justify-between rounded-xl bg-white p-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-warm">
                                    {app.profiles?.avatar_url ? <img src={app.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <span className="text-xs font-medium">{app.profiles?.display_name ?? "Creator"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {app.status === "pending" && (
                                    <>
                                      <Button size="sm" variant="success" className="h-6 rounded-xl text-[10px] px-2" onClick={() => updateApplicationStatus(app.id, "accepted")}>{t("dashboard.accept")}</Button>
                                      <Button size="sm" variant="destructive" className="h-6 rounded-xl text-[10px] px-2" onClick={() => updateApplicationStatus(app.id, "rejected")}>{t("dashboard.reject")}</Button>
                                    </>
                                  )}
                                  <StatusBadge status={app.status} />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {page === "messages" && (
            <div className="flex h-[calc(100vh-200px)] gap-4">
              <div className="w-80 shrink-0 space-y-3 overflow-y-auto rounded-3xl border border-border/60 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">{t("brand.messagesTitle")}</h2>
                  {requests.filter((r) => r.status === "pending").length > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-foreground">
                      {requests.filter((r) => r.status === "pending").length}
                    </span>
                  )}
                </div>
                {(conversations as any[]).length === 0 ? (
                  <div className="py-12 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/30" />
                    <p className="mt-2 text-sm text-muted-foreground">{t("brand.messagesNoConversations")}</p>
                  </div>
                ) : (
                  (conversations as any[]).map((conv: any) => (
                    <button
                      key={conv.otherId}
                      onClick={() => setSelectedChat(conv.otherId)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                        selectedChat === conv.otherId ? "bg-[#F5EDE0]" : "hover:bg-secondary/40"
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-warm">
                        {conv.otherProfile?.avatar_url ? (
                          <img src={conv.otherProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-sm font-medium text-muted-foreground">
                            {conv.otherProfile?.display_name?.[0] ?? "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{conv.otherProfile?.display_name ?? "Unknown"}</p>
                        <p className="truncate text-xs text-muted-foreground">{conv.lastMessage?.body ?? ""}</p>
                      </div>
                    </button>
                  ))
                )}
                {requests.length > 0 && (
                  <div className="pt-3 border-t border-border/40">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("brand.messagesOutgoing")}</p>
                    {requests.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2 py-1.5 text-xs">
                        <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-warm">
                          {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <span className="truncate flex-1">{r.profiles?.display_name ?? "Creator"}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col rounded-3xl border border-border/60 bg-white shadow-sm">
                {!selectedChat ? (
                  <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/20" />
                      <p className="mt-3 font-display text-lg text-muted-foreground">{t("common.selectConversation")}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 border-b border-border/40 px-6 py-4">
                      <button onClick={() => setSelectedChat(null)} className="lg:hidden mr-1"><X className="h-4 w-4" /></button>
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-warm">
                        {(conversations as any[]).find((c) => c.otherId === selectedChat)?.otherProfile?.avatar_url ? (
                          <img src={(conversations as any[]).find((c) => c.otherId === selectedChat)?.otherProfile?.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-medium text-muted-foreground">
                            {(conversations as any[]).find((c) => c.otherId === selectedChat)?.otherProfile?.display_name?.[0] ?? "?"}
                          </div>
                        )}
                      </div>
                      <p className="font-display text-base font-semibold">
                        {(conversations as any[]).find((c) => c.otherId === selectedChat)?.otherProfile?.display_name ?? "Chat"}
                      </p>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto p-6">
                      {chatMessages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">{t("brand.messagesNoMessages")}</p>
                      ) : (
                        chatMessages.map((m: any) => {
                          const isMine = m.sender_id === user!.id;
                          return (
                            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-md rounded-2xl px-4 py-2.5 text-sm ${
                                isMine ? "bg-[#8B6F4C] text-white" : "bg-[#F5EDE0] text-foreground"
                              }`}>
                                <p>{m.body}</p>
                                <div className={`mt-1 flex items-center gap-1 text-[10px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  {m.read_at && <CheckCheck className="h-3 w-3" />}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <div className="border-t border-border/40 p-4">
                      <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
                        <Input
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          placeholder={t("common.typeMessage")}
                          className="flex-1 rounded-2xl border-border/60 bg-[#FAF8F5]"
                        />
                        <Button type="submit" size="icon" variant="accent" className="h-10 w-10 shrink-0 rounded-2xl">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {page === "analytics" && (
            <div>
              <h2 className="mb-6 font-display text-2xl font-semibold">{t("brand.analyticsTitle")}</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5EDE0]">
                      <Users className="h-5 w-5 text-[#8B6F4C]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.analyticsTotalCreators")}</p>
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">{creators.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("brand.analyticsAvailable")}</p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5EDE0]">
                      <Bookmark className="h-5 w-5 text-[#8B6F4C]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.analyticsSavedCreators")}</p>
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">{saved.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("brand.analyticsInShortlist")}</p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5EDE0]">
                      <Megaphone className="h-5 w-5 text-[#8B6F4C]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.analyticsCampaigns")}</p>
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">{campaigns.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{campaigns.filter((c) => c.status === "active").length} {t("brand.analyticsActive")}</p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5EDE0]">
                      <Send className="h-5 w-5 text-[#8B6F4C]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.analyticsRequestsSent")}</p>
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">{requests.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("brand.analyticsAcceptedPending", { accepted: requests.filter((r) => r.status === "accepted").length, pending: requests.filter((r) => r.status === "pending").length })}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5EDE0]">
                      <Activity className="h-5 w-5 text-[#8B6F4C]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.analyticsAvgEngagement")}</p>
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">—</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("brand.analyticsAcrossSaved")}</p>
                </div>
                <div className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5EDE0]">
                      <MessageCircle className="h-5 w-5 text-[#8B6F4C]" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("brand.analyticsMessages")}</p>
                  </div>
                  <p className="mt-4 font-display text-3xl font-semibold">{(conversations as any[]).length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("brand.analyticsActiveConversations")}</p>
                </div>
              </div>
            </div>
          )}

          {page === "settings" && (
            <div className="max-w-2xl space-y-6">
              <h2 className="font-display text-2xl font-semibold">{t("brand.settingsTitle")}</h2>

              <div className="space-y-5 rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-semibold">{t("brand.profile")}</h3>

                <div className="flex items-center gap-6">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-warm">
                    {pWatch("avatar_url") ? (
                      <img src={pWatch("avatar_url")} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-2xl font-semibold text-muted-foreground/30">
                        {(brandProfile?.display_name?.[0] ?? "B").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("brand.settingsBrandAvatar")}</p>
                    <p className="text-xs text-muted-foreground">{t("brand.settingsAvatarHint")}</p>
                    <ImageUpload
                      value={pWatch("avatar_url")}
                      onChange={(url) => { pSet("avatar_url", url); }}
                      folder="avatars"
                    />
                  </div>
                </div>

                <form onSubmit={pHandle(saveProfile)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t("contact.brand")}</Label>
                    <Input {...pReg("display_name")} className="rounded-xl" />
                    {pErr.display_name && <p className="text-xs text-destructive">{pErr.display_name.message as string}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("brand.settingsAbout")}</Label>
                    <Textarea rows={3} {...pReg("bio")} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("contact.contactPerson")}</Label>
                    <Input {...pReg("contact_person")} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("brand.settingsWebsite")}</Label>
                    <Input {...pReg("website")} placeholder="https://example.com" className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("brand.settingsIndustry")}</Label>
                    <Input {...pReg("industry")} placeholder="e.g. Fashion, Beauty, Tech..." className="rounded-xl" />
                  </div>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm font-medium text-foreground">{t("brand.settingsSocialLinks")}</p>
                    <div className="space-y-1.5">
                      <Label>{t("brand.settingsSocialLinks")}</Label>
                      <Input {...pReg("social_link")} placeholder="https://instagram.com/yourhandle" className="rounded-xl" />
                    </div>
                  </div>
                  <Button type="submit" variant="accent" className="rounded-2xl" disabled={pSub}>
                    {pSub ? t("common.saving") : t("common.save")}
                  </Button>
                </form>
              </div>

              <div className="space-y-5 rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-semibold">{t("brand.settingsNotifications")}</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("common.noNotifications")}</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-3 rounded-2xl bg-[#FAF8F5] p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{n.title}</p>
                            {!n.read_at && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.read_at && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markNotifRead(n.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => deleteNotif(n.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  {notifications.filter((n) => !n.read_at).length > 0 && (
                    <Button variant="outline" size="sm" className="w-full rounded-2xl text-xs" onClick={markAllNotifRead}>
                      {t("common.markAllRead")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-5 rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-semibold">{t("brand.settingsSubscription")}</h3>
                <SubscriptionPanel />
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        {page === "discover" && (
          <aside className="hidden w-[280px] shrink-0 xl:block space-y-6">
            {/* My Shortlist */}
            <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold">{t("brand.sidebarMyShortlist")}</h3>
              {saved.length === 0 ? (
                <p className="mt-4 text-xs text-muted-foreground">{t("brand.sidebarNoSaved")}</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {saved.slice(0, 4).map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <Link to="/creator/$id" params={{ id: s.creator_id }} className="group flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-warm">
                          {s.profiles?.avatar_url ? (
                            <img src={s.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-medium text-muted-foreground">
                              {s.profiles?.display_name?.[0] ?? "·"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium group-hover:text-accent transition-colors">{s.profiles?.display_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{s.profiles?.city ?? "Unknown"}</p>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-secondary/40">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-border/60 p-1.5">
                          <DropdownMenuItem onClick={() => unsave(s.id)} className="rounded-xl text-xs">{t("brand.shortlistRemove")}</DropdownMenuItem>
                          <DropdownMenuItem asChild className="rounded-xl text-xs">
                            <Link to="/creator/$id" params={{ id: s.creator_id }}>{t("brand.shortlistViewProfile")}</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
              {saved.length > 0 && (
                <button
                  onClick={() => setPage("shortlist")}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl bg-[#F5EDE0] py-2 text-xs font-medium text-[#8B6F4C] transition-colors hover:bg-[#EDE0D0]"
                >
                  {t("brand.sidebarViewAll")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Engagement Overview */}
            <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("brand.sidebarEngagementOverview")}</h3>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-5">
                <div className="flex items-end gap-1" style={{ height: 64 }}>
                  {[35, 55, 42, 70, 58, 80, 62].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-[#D4C5B0] to-[#C4B5A0] transition-all duration-300 hover:from-[#8B6F4C] hover:to-[#A0805A]"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                  <span>{t("brand.sidebarMon")}</span><span>{t("brand.sidebarTue")}</span><span>{t("brand.sidebarWed")}</span><span>{t("brand.sidebarThu")}</span><span>{t("brand.sidebarFri")}</span><span>{t("brand.sidebarSat")}</span><span>{t("brand.sidebarSun")}</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("brand.sidebarAvgEngagement")}</p>
                  <p className="font-display text-xl font-semibold">3.2%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("brand.sidebarTotalCreators")}</p>
                  <p className="font-display text-xl font-semibold">{creators.length}</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      <Dialog open={campaignOpen} onOpenChange={(o) => { setCampaignOpen(o); if (!o) { setEditingCamp(null); cReset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-2xl">{editingCamp ? t("brand.campaignsEdit") : t("brand.newCampaign")}</DialogTitle></DialogHeader>
          <form onSubmit={cHandle(saveCampaign)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("brand.campaignTitle")}</Label>
              <Input {...cReg("title")} className="rounded-xl" />
              {cErr.title && <p className="text-xs text-destructive">{cErr.title.message as string}</p>}
            </div>
            <div className="space-y-1.5"><Label>{t("brand.brief")}</Label><Textarea rows={4} {...cReg("brief")} className="rounded-xl" /></div>
            <div className="space-y-1.5"><Label>{t("brand.budget")}</Label><Input {...cReg("budget_range")} className="rounded-xl" /></div>
            <Button type="submit" variant="accent" className="w-full rounded-2xl" disabled={cSub}>
              {cSub ? "..." : editingCamp ? t("common.save") : t("common.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        title={t("brand.upgradeBrandPlanTitle")}
        description={t("brand.upgradeBrandPlanDesc")}
        type="collections"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: t("dashboard.statusPending"), cls: "bg-secondary text-muted-foreground" },
    accepted: { label: t("dashboard.statusAccepted"), cls: "bg-success/10 text-success border border-success/30" },
    rejected: { label: t("dashboard.statusRejected"), cls: "bg-destructive/10 text-destructive" },
  };
  const s = map[status] ?? map.pending;
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
