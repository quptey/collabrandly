import {
  createFileRoute,
  useNavigate,
  useSearch,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/i18n";
import {
  Home,
  User,
  Image as ImageIcon,
  Store,
  BarChart3,
  Handshake,
  Megaphone,
  MessageCircle,
  Bell,
  LogOut,
  Settings,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Menu,
  Upload,
  ArrowUp,
  ArrowDown,
  BadgeCheck,
  Ban,
  Clock,
  Globe,
  ExternalLink,
  Instagram,
  Smartphone,
  Search,
  Heart,
  Star,
  Eye,
  Undo2,
  Send,
  CheckCheck,
  Activity,
  Paperclip,
  Lock,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { UpgradeModal } from "@/components/upgrade-modal";
import { PageSkeleton } from "@/components/loading-skeleton";
import { ProposalChatCard } from "@/components/proposal-chat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/notifications-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { collectionSchema } from "@/lib/validation";
import {
  CATEGORIES,
  getCategoryLabel,
  CITIES,
  FOLLOWER_RANGES,
  SOCIAL_PLATFORMS_DATA,
  SOCIAL_PLATFORM_COLUMNS,
  type City,
  type FollowerRange,
} from "@/lib/constants";
import { SocialLinkInput } from "@/components/social-link-input";
import { getNotificationRoute } from "@/lib/notifications";
import { InstagramIcon, TelegramIcon } from "@/components/social-icons";
import { CollaborationReviewModal } from "@/components/collaboration-review-modal";

const creatorSearchSchema = z.object({
  page: fallback(
    z.enum([
      "overview",
      "profile",
      "portfolio",
      "storefront",
      "analytics",
      "campaigns",
      "collaborations",
      "messages",
      "notifications",
    ]),
    undefined,
  ).optional(),
  chat: z.string().optional(),
});

export const Route = createFileRoute("/creator")({
  validateSearch: zodValidator(creatorSearchSchema),
  head: () => ({ meta: [{ title: "Creator Dashboard — Collabrandly" }] }),
  component: CreatorDashboard,
});

type NavPage =
  | "overview"
  | "profile"
  | "portfolio"
  | "storefront"
  | "analytics"
  | "campaigns"
  | "collaborations"
  | "messages"
  | "notifications";

function CreatorDashboard() {
  const { user, loading, role, profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useT();
  const searchParams = useSearch({ from: "/creator" });
  const NAV_ITEMS: { key: NavPage; label: string; icon: typeof Home }[] = [
    { key: "overview", label: t("creator.navOverview"), icon: Home },
    { key: "profile", label: t("creator.navProfile"), icon: User },
    { key: "portfolio", label: t("creator.navPortfolio"), icon: ImageIcon },
    { key: "storefront", label: t("creator.navStorefront"), icon: Store },
    { key: "analytics", label: t("creator.navAnalytics"), icon: BarChart3 },
    { key: "campaigns", label: t("creator.navCampaigns"), icon: Megaphone },
    { key: "collaborations", label: t("creator.navCollaborations"), icon: Handshake },
    { key: "messages", label: t("creator.navMessages"), icon: MessageCircle },
    { key: "notifications", label: t("creator.navNotifications"), icon: Bell },
  ];
  const { isBrandPlan } = useSubscription();
  const qc = useQueryClient();
  const [page, setPage] = useState<NavPage>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // If on a child route (e.g. public profile at /creator/$id), render child directly
  // Must be AFTER all hooks to avoid "Rendered fewer hooks" error
  if (location.pathname !== "/creator") {
    return <Outlet />;
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && role && role !== "creator") {
      if (isAdmin) navigate({ to: "/admin" });
      else if (role === "brand") navigate({ to: "/brand" });
      else if (role === "shopper") navigate({ to: "/dashboard" });
    }
    if (!loading && profile && !profile.onboarded) {
      navigate({ to: "/onboarding" });
    }
    if (searchParams.page) {
      setPage(searchParams.page);
    }
    if (page === "campaigns") {
      navigate({ to: "/campaigns" });
    }
  }, [user, loading, role, isAdmin, profile?.onboarded, navigate, page, searchParams.page]);

  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const isPending = creatorProfile?.verification_status === "pending";
  const isApproved =
    creatorProfile?.verification_status === "approved" ||
    creatorProfile?.verification_status === "active";
  const isRejected = creatorProfile?.verification_status === "rejected";

  const { data: notifications = [] } = useQuery({
    queryKey: ["creator-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const unreadNotifs = notifications.filter((n: any) => !n.read_at).length;

  if (loading)
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <PageSkeleton />
        </div>
      </div>
    );

  if (!user || !creatorProfile) return null;

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 md:h-16 max-w-[1440px] items-center gap-2 md:gap-4 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0">
            <img
              src="/logo.png"
              alt="Collabrandly"
              className="h-7 md:h-9 w-auto rounded-full object-cover"
            />
            <span className="hidden sm:inline font-sans text-base md:text-lg font-semibold tracking-tight text-foreground">
              Collabrandly
            </span>
          </Link>

          {isApproved && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-verified/10 px-2 py-0.5 text-[10px] md:text-[11px] font-medium text-verified border border-verified/30">
              <BadgeCheck className="h-3 w-3" /> {t("creator.headerVerified")}
            </span>
          )}
          {isPending && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] md:text-[11px] font-medium text-warning border border-warning/30">
              <Clock className="h-3 w-3" /> {t("creator.headerPendingReview")}
            </span>
          )}
          {isRejected && (
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] md:text-[11px] font-medium text-destructive">
              <Ban className="h-3 w-3" /> {t("creator.headerRejected")}
            </span>
          )}

          <div className="relative flex-1 max-w-xs md:max-w-lg mx-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("creator.searchPlaceholder")}
              className="h-8 md:h-10 rounded-2xl border border-border/60 bg-[#FAF8F5] pl-8 md:pl-10 text-xs md:text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-border"
            />
          </div>

          <button
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-1 md:gap-3">
            <LanguageSwitcher />
            <NotificationsBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-9 w-9 overflow-hidden rounded-full border border-border/40 bg-warm">
                  {creatorProfile?.avatar_url ? (
                    <img
                      src={creatorProfile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs font-medium text-muted-foreground">
                      {(creatorProfile?.display_name?.[0] ?? "C").toUpperCase()}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                  {creatorProfile?.display_name ?? "Creator"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPage("profile")} className="rounded-xl">
                  <User className="mr-2 h-4 w-4" /> {t("creator.headerProfile")}
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/profile">
                    <Settings className="mr-2 h-4 w-4" /> {t("nav.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/creator/$id" params={{ id: user!.id } as any}>
                    <ExternalLink className="mr-2 h-4 w-4" /> {t("creator.headerPublicProfile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                  className="rounded-xl text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" /> {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] px-4 md:px-6 py-4 md:py-8 gap-4 md:gap-8">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <aside
          className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-border/60" : "hidden"} md:flex md:flex-col w-[220px] shrink-0`}
        >
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const notifCount = item.key === "notifications" ? unreadNotifs : 0;
              return (
                <button
                  key={item.key}
                  onClick={() => setPage(item.key)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    page === item.key
                      ? item.key === "campaigns"
                        ? "bg-accent/15 text-accent font-semibold"
                        : "bg-[#F5EDE0] text-foreground"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  {notifCount > 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                      {notifCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-border/60 bg-white p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("creator.sidebarQuickStats")}
            </p>
            <div className="mt-3 space-y-3">
              <StatRow
                label={t("creator.sidebarStatus")}
                value={
                  isApproved
                    ? t("creator.overviewApproved")
                    : isPending
                      ? t("creator.overviewPending")
                      : isRejected
                        ? t("creator.overviewRejected")
                        : t("creator.overviewDraft")
                }
              />
              <StatRow label={t("creator.sidebarRole")} value="Creator" />
              <StatRow
                label={t("creator.sidebarCategory")}
                value={
                  creatorProfile?.category
                    ? getCategoryLabel(t, creatorProfile.category, creatorProfile.custom_category)
                    : "—"
                }
              />
              <StatRow label={t("creator.sidebarCity")} value={creatorProfile?.city ?? "—"} />
            </div>
          </div>

          <Link to="/creator/$id" params={{ id: user!.id } as any} className="block">
            <Button
              variant="accent"
              size="sm"
              className="mt-4 w-full rounded-2xl text-xs whitespace-normal h-auto min-h-[2rem] py-1.5 leading-tight"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5 shrink-0" />{" "}
              <span>{t("creator.sidebarViewPublicProfile")}</span>
            </Button>
          </Link>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          {/* Status Banners */}
          {isPending && (
            <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 p-5">
              <p className="font-display text-lg font-semibold">
                {t("dashboard.applicationSubmitted")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("dashboard.applicationPendingText")}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning border border-warning/30">
                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                {t("dashboard.statusPending")}
              </div>
            </div>
          )}
          {isRejected && (
            <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
              <p className="font-display text-lg font-semibold">
                {t("dashboard.applicationRejected")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {creatorProfile?.rejection_reason
                  ? t("dashboard.rejectionReason") + " " + creatorProfile.rejection_reason
                  : t("dashboard.rejectionNoReason")}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
                {t("dashboard.statusRejected")}
              </div>
              <Button
                size="sm"
                variant="accent"
                className="mt-4 rounded-2xl"
                onClick={async () => {
                  await supabase
                    .from("profiles")
                    .update({
                      verification_status: "pending",
                      rejection_reason: null,
                      approved: false,
                    })
                    .eq("id", user!.id);
                  const existing = await supabase
                    .from("applications")
                    .select("id")
                    .eq("user_id", user!.id)
                    .maybeSingle();
                  if (existing.data) {
                    await supabase
                      .from("applications")
                      .update({ status: "pending", rejection_reason: null })
                      .eq("id", existing.data.id);
                  }
                  toast.success(t("creator.applicationResubmitted"));
                  qc.invalidateQueries({ queryKey: ["creator-profile", user!.id] });
                }}
              >
                <Undo2 className="mr-2 h-4 w-4" /> {t("creator.resubmitApplication")}
              </Button>
            </div>
          )}

          {page === "overview" && (
            <OverviewPage creatorProfile={creatorProfile} user={user!} qc={qc} />
          )}
          {page === "profile" && (
            <ProfilePage creatorProfile={creatorProfile} user={user!} qc={qc} />
          )}
          {page === "portfolio" && <PortfolioPage creatorId={user!.id} qc={qc} />}
          {page === "storefront" && <StorefrontPage creatorId={user!.id} qc={qc} />}
          {page === "analytics" && (
            <AnalyticsPage creatorProfile={creatorProfile} creatorId={user!.id} />
          )}

          {page === "collaborations" && <CollaborationsPage creatorId={user!.id} qc={qc} />}
          {page === "messages" && (
            <MessagesPage userId={user!.id} qc={qc} chatUser={searchParams.chat} />
          )}
          {page === "notifications" && (
            <NotificationsPage userId={user!.id} qc={qc} notifications={notifications} />
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-[280px] shrink-0 hidden xl:block space-y-6">
          {isApproved && (
            <div className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-6 w-6 text-verified" />
                <div>
                  <p className="text-sm font-semibold">{t("creator.sidebarVerifiedCreator")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("creator.sidebarProfileActive")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <RecentNotificationsWidget notifications={notifications} userId={user!.id} qc={qc} />

          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("creator.sidebarQuickLinks")}
            </p>
            <div className="mt-3 space-y-2">
              <Link
                to="/marketplace"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors"
              >
                <Store className="h-4 w-4" /> {t("creator.sidebarBrowseMarketplace")}
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" /> {t("creator.sidebarAccountSettings")}
              </Link>
              <button
                onClick={() => setPage("profile")}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4" /> {t("creator.sidebarEditProfile")}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-white/80 backdrop-blur-xl md:hidden pb-safe">
        <div className="flex items-center justify-around py-1.5 px-2">
          {[
            { key: "overview", label: t("creator.navOverview"), icon: Home },
            { key: "storefront", label: t("creator.navStorefront"), icon: Store },
            { key: "messages", label: t("creator.navMessages"), icon: MessageCircle },
            { key: "profile", label: t("creator.navProfile"), icon: User },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key as NavPage)}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  page === item.key
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} type="collections" />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

/* ==================== OVERVIEW PAGE ==================== */
function OverviewPage({ creatorProfile, user, qc }: { creatorProfile: any; user: any; qc: any }) {
  const { t } = useT();
  const { data: stats } = useQuery({
    queryKey: ["creator-overview-stats", user.id],
    enabled: !!user,
    queryFn: async () => {
      const [viewsRes, savesRes, requestsRes, messagesRes] = await Promise.all([
        supabase
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("viewed_id", user.id),
        supabase
          .from("saved_creators")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id),
        supabase
          .from("brand_requests")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", user.id),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id),
      ]);
      return {
        profileViews: viewsRes.count ?? 0,
        savedByBrands: savesRes.count ?? 0,
        collabRequests: requestsRes.count ?? 0,
        messagesReceived: messagesRes.count ?? 0,
      };
    },
  });

  const profileCompletion = [
    creatorProfile?.display_name,
    creatorProfile?.bio,
    creatorProfile?.avatar_url,
    creatorProfile?.category,
    creatorProfile?.city,
    creatorProfile?.social_link,
    creatorProfile?.website,
  ].filter(Boolean).length;
  const completionPct = Math.min(100, Math.round((profileCompletion / 7) * 100));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("creator.overviewWelcomeBack")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          {creatorProfile?.display_name}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("creator.overviewProfileViews")}
          value={stats?.profileViews ?? 0}
          icon={Eye}
        />
        <MetricCard
          label={t("creator.overviewSavedByBrands")}
          value={stats?.savedByBrands ?? 0}
          icon={Heart}
        />
        <MetricCard
          label={t("creator.overviewCollabRequests")}
          value={stats?.collabRequests ?? 0}
          icon={Handshake}
        />
        <MetricCard
          label={t("creator.overviewMessages")}
          value={stats?.messagesReceived ?? 0}
          icon={MessageCircle}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("creator.overviewStatus")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {creatorProfile?.verification_status === "approved" ||
            creatorProfile?.verification_status === "active" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success border border-success/30">
                <BadgeCheck className="h-3.5 w-3.5" /> {t("creator.overviewApproved")}
              </span>
            ) : creatorProfile?.verification_status === "pending" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning border border-warning/30">
                <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />{" "}
                {t("creator.overviewPending")}
              </span>
            ) : creatorProfile?.verification_status === "rejected" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                <Ban className="h-3.5 w-3.5" /> {t("creator.overviewRejected")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                {t("creator.overviewDraft")}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("creator.overviewProfileCompletion")}
          </p>
          <div className="mt-3">
            <p className="font-display text-3xl font-semibold">{completionPct}%</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("creator.overviewCompletionHint")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}

/* ==================== PROFILE PAGE ==================== */
function ProfilePage({ creatorProfile, user, qc }: { creatorProfile: any; user: any; qc: any }) {
  const { t } = useT();
  const LANGUAGE_OPTIONS = [
    { value: "en", label: "English" },
    { value: "ru", label: "Russian" },
    { value: "kk", label: "Kazakh" },
  ];
  const form = useForm({
    values: {
      display_name: creatorProfile?.display_name ?? "",
      bio: creatorProfile?.bio ?? "",
      avatar_url: creatorProfile?.avatar_url ?? "",
      cover_url: creatorProfile?.cover_url ?? "",
      category: creatorProfile?.category ?? "",
      custom_category: creatorProfile?.custom_category ?? "",
      city: creatorProfile?.city ?? "",
      follower_range: creatorProfile?.follower_range ?? "",
      follower_count: creatorProfile?.follower_count ?? 0,
      languages: Array.isArray(creatorProfile?.languages) ? creatorProfile.languages : [],
    },
  });

  function parseSocialLinks(profile: any): { platform: string; url: string }[] {
    const links: { platform: string; url: string }[] = [];
    for (const [platform, column] of Object.entries(SOCIAL_PLATFORM_COLUMNS)) {
      const val = profile?.[column];
      if (val) links.push({ platform, url: val });
    }
    return links;
  }

  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>(() =>
    parseSocialLinks(creatorProfile),
  );
  const [addSocialOpen, setAddSocialOpen] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");

  const addedPlatforms = new Set(socialLinks.map((l) => l.platform));
  const availablePlatforms = SOCIAL_PLATFORMS_DATA.filter((p) => !addedPlatforms.has(p.value));

  function addSocialLink() {
    if (!newSocialPlatform || !newSocialUrl.trim()) return;
    setSocialLinks((prev) => [...prev, { platform: newSocialPlatform, url: newSocialUrl.trim() }]);
    setNewSocialPlatform("");
    setNewSocialUrl("");
    setAddSocialOpen(false);
  }

  function removeSocialLink(platform: string) {
    setSocialLinks((prev) => prev.filter((l) => l.platform !== platform));
  }

  function updateSocialUrl(platform: string, url: string) {
    setSocialLinks((prev) => prev.map((l) => (l.platform === platform ? { ...l, url } : l)));
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form;

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    Array.isArray(creatorProfile?.languages) ? creatorProfile.languages : [],
  );

  async function saveProfile(data: any) {
    const updateData: any = {
      display_name: data.display_name,
      bio: data.bio,
      avatar_url: data.avatar_url || null,
      cover_url: data.cover_url || null,
      category: data.category || null,
      custom_category: data.category === "other" ? data.custom_category || null : null,
      city: data.city || null,
      follower_range: data.follower_range || null,
      follower_count: data.follower_count ? Number(data.follower_count) : null,
      languages: selectedLanguages,
      social_link: null,
    };
    for (const column of Object.values(SOCIAL_PLATFORM_COLUMNS)) {
      updateData[column] = null;
    }
    for (const link of socialLinks) {
      const column = SOCIAL_PLATFORM_COLUMNS[link.platform];
      if (column) updateData[column] = link.url || null;
    }
    const { error } = await supabase.from("profiles").update(updateData).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success(t("creator.profileUpdated"));
    qc.invalidateQueries({ queryKey: ["creator-profile", user.id] });
  }

  function toggleLanguage(lang: string) {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  return (
    <form onSubmit={handleSubmit(saveProfile)} className="space-y-8 pb-24 sm:pb-0">
      <div>
        <h2 className="font-display text-2xl font-semibold">{t("creator.profileTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("creator.profileSubtitle")}</p>
      </div>

      {/* Cover Image */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
        <Label>{t("creator.profileCoverImage")}</Label>
        <div className="h-48 w-full overflow-hidden rounded-2xl bg-warm">
          {watch("cover_url") ? (
            <img src={watch("cover_url")} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground/40">
              {t("creator.profileCoverHint")}
            </div>
          )}
        </div>
        <ImageUpload
          value={watch("cover_url")}
          onChange={(v) => setValue("cover_url", v)}
          folder="covers"
        />
      </div>

      {/* Avatar + Name */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
        <Label>{t("creator.profilePhoto")}</Label>
        <ImageUpload
          value={watch("avatar_url")}
          onChange={(v) => setValue("avatar_url", v)}
          folder="avatars"
        />
        <div className="space-y-1.5">
          <Label htmlFor="dn">{t("creator.profileDisplayName")}</Label>
          <Input id="dn" {...register("display_name")} />
          {errors.display_name && (
            <p className="text-xs text-destructive">{errors.display_name.message as string}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
        <Label htmlFor="bio">{t("creator.profileBio")}</Label>
        <Textarea
          id="bio"
          rows={4}
          {...register("bio")}
          placeholder={t("creator.profileBioPlaceholder")}
        />
      </div>

      {/* Category, City, Followers */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
        <h3 className="font-display text-base font-semibold">{t("creator.profileDetails")}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{t("creator.profileCategory")}</Label>
            <Select
              value={watch("category")}
              onValueChange={(v) => {
                setValue("category", v);
                if (v !== "other") setValue("custom_category", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("creator.profileSelectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`category.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {watch("category") === "other" && (
              <Input
                className="mt-2"
                placeholder={t("category.customPlaceholder")}
                value={watch("custom_category") ?? ""}
                onChange={(e) => setValue("custom_category", e.target.value)}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>{t("creator.profileCity")}</Label>
            <Select value={watch("city")} onValueChange={(v) => setValue("city", v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("creator.profileSelectCity")} />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("creator.profileAudienceSize")}</Label>
            <Select
              value={watch("follower_range")}
              onValueChange={(v) => setValue("follower_range", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("creator.profileSelectRange")} />
              </SelectTrigger>
              <SelectContent>
                {FOLLOWER_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("creator.profileFollowersCount")}</Label>
            <Input
              type="number"
              min="0"
              step="1"
              {...register("follower_count" as any, { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
        <h3 className="font-display text-base font-semibold">{t("creator.profileSocialLinks")}</h3>
        <p className="text-xs text-muted-foreground">{t("creator.profileSocialHint")}</p>
        {socialLinks.map((link) => (
          <div key={link.platform} className="group flex items-center gap-2">
            <SocialLinkInput
              platform={link.platform}
              value={link.url}
              onChange={(url) => updateSocialUrl(link.platform, url)}
              onRemove={() => removeSocialLink(link.platform)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSocialLink(link.platform)}
              className="shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {availablePlatforms.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddSocialOpen(true)}
            className="rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> {t("creator.profileSocialAddNew")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">{t("creator.profileSocialAllAdded")}</p>
        )}
      </div>

      {/* Add Social Network Dialog */}
      <Dialog open={addSocialOpen} onOpenChange={setAddSocialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("creator.profileSocialAddNew")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("creator.profileSocialSelectPlatform")}</Label>
              <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder={t("creator.profileSocialSelectPlatform")} />
                </SelectTrigger>
                <SelectContent>
                  {availablePlatforms.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newSocialPlatform && (
              <SocialLinkInput
                platform={newSocialPlatform}
                value={newSocialUrl}
                onChange={setNewSocialUrl}
                onRemove={() => {
                  setNewSocialUrl("");
                }}
              />
            )}
            <Button
              type="button"
              variant="accent"
              className="w-full rounded-2xl"
              disabled={!newSocialPlatform || !newSocialUrl.trim()}
              onClick={addSocialLink}
            >
              {t("creator.profileSocialAddButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Languages */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 space-y-4">
        <h3 className="font-display text-base font-semibold">{t("creator.profileLanguages")}</h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => toggleLanguage(lang.value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedLanguages.includes(lang.value)
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-md:sticky max-md:bottom-0 max-md:bg-background max-md:pt-4 max-md:pb-4 max-md:-mx-4 max-md:px-4 max-md:border-t max-md:border-border">
        <Button
          type="submit"
          size="lg"
          variant="accent"
          className="w-full sm:w-auto rounded-2xl"
          disabled={isSubmitting}
        >
          {isSubmitting ? t("creator.profileSaving") : t("creator.profileSaveChanges")}
        </Button>
      </div>
    </form>
  );
}

/* ==================== PORTFOLIO PAGE ==================== */
function PortfolioPage({ creatorId, qc }: { creatorId: string; qc: any }) {
  const { t } = useT();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editPhoto, setEditPhoto] = useState<any | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["portfolio-photos", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolio_photos")
        .select("*")
        .eq("creator_id", creatorId)
        .order("position", { ascending: true });
      return data ?? [];
    },
  });

  async function addPhoto() {
    if (!newUrl) return toast.error("Please provide a photo URL");
    const maxPos = photos.reduce((max: number, p: any) => Math.max(max, p.position), -1);
    await supabase.from("portfolio_photos").insert({
      creator_id: creatorId,
      url: newUrl,
      caption: newCaption,
      position: maxPos + 1,
      is_cover: photos.length === 0,
    });
    setNewUrl("");
    setNewCaption("");
    setUploadOpen(false);
    qc.invalidateQueries({ queryKey: ["portfolio-photos", creatorId] });
    toast.success(t("creator.portfolioAdded"));
  }

  async function deletePhoto(id: string) {
    if (!confirm(t("creator.portfolioDeleteConfirm"))) return;
    await supabase.from("portfolio_photos").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["portfolio-photos", creatorId] });
    toast.success(t("creator.portfolioRemoved"));
  }

  async function setCover(id: string) {
    await supabase.from("portfolio_photos").update({ is_cover: false }).eq("creator_id", creatorId);
    await supabase.from("portfolio_photos").update({ is_cover: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["portfolio-photos", creatorId] });
    toast.success(t("creator.portfolioCoverUpdated"));
  }

  async function movePhoto(id: string, direction: "up" | "down") {
    const idx = photos.findIndex((p: any) => p.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === photos.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const current = photos[idx];
    const swap = photos[swapIdx];
    await supabase
      .from("portfolio_photos")
      .update({ position: swap.position })
      .eq("id", current.id);
    await supabase
      .from("portfolio_photos")
      .update({ position: current.position })
      .eq("id", swap.id);
    qc.invalidateQueries({ queryKey: ["portfolio-photos", creatorId] });
  }

  async function updateCaption(id: string, caption: string) {
    await supabase.from("portfolio_photos").update({ caption }).eq("id", id);
    setEditPhoto(null);
    qc.invalidateQueries({ queryKey: ["portfolio-photos", creatorId] });
    toast.success(t("creator.portfolioCaptionUpdated"));
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t("creator.portfolioTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("creator.portfolioSubtitle")}</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} variant="accent" className="rounded-2xl">
          <Plus className="mr-2 h-4 w-4" /> {t("creator.portfolioAddPhoto")}
        </Button>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white p-20 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-display text-xl">{t("creator.portfolioEmpty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("creator.portfolioEmptyHint")}</p>
          <Button onClick={() => setUploadOpen(true)} className="mt-6 rounded-2xl">
            <Upload className="mr-2 h-4 w-4" /> {t("creator.portfolioUploadFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo: any, idx: number) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-2xl border border-border bg-white"
            >
              <div className="aspect-[4/3] overflow-hidden bg-warm">
                <img
                  src={photo.url}
                  alt={photo.caption || "Portfolio photo"}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              {photo.is_cover && (
                <span className="absolute left-2 top-2 rounded-full bg-accent/90 px-2.5 py-0.5 text-[10px] font-semibold text-accent-foreground backdrop-blur-sm">
                  {t("creator.portfolioCover")}
                </span>
              )}
              <div className="space-y-2 p-4">
                {editPhoto?.id === photo.id ? (
                  <div className="flex gap-2">
                    <Input
                      defaultValue={photo.caption}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          updateCaption(photo.id, (e.target as HTMLInputElement).value);
                        if (e.key === "Escape") setEditPhoto(null);
                      }}
                      onBlur={(e) => updateCaption(photo.id, e.target.value)}
                      className="text-sm"
                    />
                  </div>
                ) : (
                  <p className="text-sm">
                    {photo.caption || (
                      <span className="text-muted-foreground/50 italic">
                        {t("creator.portfolioNoCaption")}
                      </span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditPhoto(photo)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePhoto(photo.id, "up")}
                    disabled={idx === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => movePhoto(photo.id, "down")}
                    disabled={idx === photos.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  {!photo.is_cover && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCover(photo.id)}
                      title={t("creator.portfolioSetAsCover")}
                    >
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => deletePhoto(photo.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("creator.portfolioAddDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("creator.portfolioPhoto")}</Label>
              <ImageUpload value={newUrl} onChange={(v) => setNewUrl(v)} folder="portfolio" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("creator.portfolioCaption")}</Label>
              <Input
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                placeholder={t("creator.portfolioCaptionPlaceholder")}
              />
            </div>
            <Button onClick={addPhoto} className="w-full rounded-2xl" disabled={!newUrl}>
              <Upload className="mr-2 h-4 w-4" /> {t("creator.portfolioAddButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== STOREFRONT PAGE ==================== */
function StorefrontPage({ creatorId, qc }: { creatorId: string; qc: any }) {
  const { t } = useT();
  const [newColOpen, setNewColOpen] = useState(false);
  const [editCol, setEditCol] = useState<any | null>(null);
  const [addProdCol, setAddProdCol] = useState<string | null>(null);
  const [editProd, setEditProd] = useState<any | null>(null);

  const colForm = useForm({ resolver: zodResolver(collectionSchema) });
  const {
    register: colReg,
    handleSubmit: colHandle,
    formState: { errors: colErr, isSubmitting: colSub },
    setValue: colSet,
    watch: colWatch,
    reset: colReset,
  } = colForm;

  const { data: collections = [] } = useQuery({
    queryKey: ["creator-collections", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("collections")
        .select("*, products(*)")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function createCollection(data: any) {
    const { error } = await supabase.from("collections").insert({
      creator_id: creatorId,
      title: data.title,
      description: data.description || null,
      cover_url: data.cover_url || null,
    });
    if (error) return toast.error(error.message);
    setNewColOpen(false);
    colReset();
    qc.invalidateQueries({ queryKey: ["creator-collections", creatorId] });
    toast.success(t("creator.storefrontCreated"));
  }

  async function updateCollection(id: string, data: any) {
    await supabase
      .from("collections")
      .update({
        title: data.title,
        description: data.description || null,
        cover_url: data.cover_url || null,
      })
      .eq("id", id);
    setEditCol(null);
    qc.invalidateQueries({ queryKey: ["creator-collections", creatorId] });
    toast.success(t("creator.storefrontUpdated"));
  }

  async function deleteCollection(id: string) {
    if (!confirm(t("creator.storefrontDeleteConfirm"))) return;
    await supabase.from("products").delete().eq("collection_id", id);
    await supabase.from("collections").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-collections", creatorId] });
    toast.success(t("creator.storefrontDeleted"));
  }

  async function addProduct(collectionId: string, data: any) {
    if (!data.name) return toast.error("Product name is required");
    await supabase.from("products").insert({
      collection_id: collectionId,
      creator_id: creatorId,
      name: data.name,
      description: data.description || null,
      image_url: data.image_url || null,
      external_link: data.external_link || null,
      position: 0,
    });
    setAddProdCol(null);
    qc.invalidateQueries({ queryKey: ["creator-collections", creatorId] });
    toast.success(t("creator.storefrontProductAdded"));
  }

  async function updateProduct(id: string, data: any) {
    await supabase
      .from("products")
      .update({
        name: data.name,
        description: data.description || null,
        image_url: data.image_url || null,
        external_link: data.external_link || null,
      })
      .eq("id", id);
    setEditProd(null);
    qc.invalidateQueries({ queryKey: ["creator-collections", creatorId] });
    toast.success(t("creator.storefrontProductUpdated"));
  }

  async function deleteProduct(id: string) {
    if (!confirm(t("creator.storefrontProductDeleteConfirm"))) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-collections", creatorId] });
    toast.success(t("creator.storefrontProductRemoved"));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t("creator.storefrontTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("creator.storefrontSubtitle")}</p>
        </div>
        <Button
          onClick={() => {
            colReset({ title: "", description: "", cover_url: "" });
            setNewColOpen(true);
          }}
          variant="accent"
          className="rounded-2xl"
        >
          <Plus className="mr-2 h-4 w-4" /> {t("creator.storefrontNewCollection")}
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white p-20 text-center">
          <Store className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-display text-xl">{t("creator.storefrontEmpty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("creator.storefrontEmptyHint")}</p>
          <Button
            onClick={() => {
              colReset({ title: "", description: "", cover_url: "" });
              setNewColOpen(true);
            }}
            className="mt-6 rounded-2xl"
          >
            <Plus className="mr-2 h-4 w-4" /> {t("creator.storefrontCreateCollection")}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {collections.map((col: any) => (
            <div key={col.id} className="rounded-2xl border border-border bg-white overflow-hidden">
              {col.cover_url && (
                <div className="h-40 w-full overflow-hidden bg-warm">
                  <img src={col.cover_url} alt={col.title} className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{col.title}</h3>
                    {col.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{col.description}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {col.products?.length ?? 0} {t("creator.storefrontProducts")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditCol(col)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteCollection(col.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Products grid */}
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(col.products ?? []).map((prod: any) => (
                    <div
                      key={prod.id}
                      className="group relative rounded-xl border border-border/60 bg-[#FAF8F5] overflow-hidden"
                    >
                      {prod.image_url ? (
                        <div className="aspect-[4/3] overflow-hidden bg-warm">
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] grid place-items-center bg-secondary/20 text-muted-foreground/30 text-sm">
                          {t("creator.storefrontNoImage")}
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium">{prod.name}</p>
                        {prod.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {prod.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditProd(prod)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteProduct(prod.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                          {prod.external_link && (
                            <a
                              href={prod.external_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto"
                            >
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setAddProdCol(col.id);
                    }}
                    className="flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-[#FAF8F5] transition-colors hover:border-accent/50 hover:bg-accent/5"
                  >
                    <Plus className="h-6 w-6 text-muted-foreground/40" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Collection Dialog */}
      <Dialog open={newColOpen} onOpenChange={setNewColOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("creator.storefrontNewCollectionDialog")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={colHandle(createCollection)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontTitleLabel")}</Label>
              <Input {...colReg("title")} placeholder="e.g. Winter Favorites" />
              {colErr.title && (
                <p className="text-xs text-destructive">{colErr.title.message as string}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontDescription")}</Label>
              <Textarea
                rows={2}
                {...colReg("description")}
                placeholder="Describe this collection"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontCoverImage")}</Label>
              <ImageUpload
                value={colWatch("cover_url")}
                onChange={(v) => colSet("cover_url", v)}
                folder="collections"
              />
            </div>
            <Button type="submit" variant="accent" className="w-full rounded-2xl" disabled={colSub}>
              {colSub ? t("creator.storefrontCreating") : t("creator.storefrontCreate")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Dialog */}
      <Dialog
        open={!!editCol}
        onOpenChange={(o) => {
          if (!o) setEditCol(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("creator.storefrontEditCollection")}
            </DialogTitle>
          </DialogHeader>
          {editCol && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.target as HTMLFormElement);
                updateCollection(editCol.id, {
                  title: f.get("title"),
                  description: f.get("description"),
                  cover_url: f.get("cover_url"),
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontTitleLabel")}</Label>
                <Input name="title" defaultValue={editCol.title} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontDescription")}</Label>
                <Textarea name="description" rows={2} defaultValue={editCol.description ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontCoverImageUrl")}</Label>
                <Input name="cover_url" defaultValue={editCol.cover_url ?? ""} />
              </div>
              <Button type="submit" variant="accent" className="w-full rounded-2xl">
                {t("creator.storefrontSave")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog
        open={!!addProdCol}
        onOpenChange={(o) => {
          if (!o) setAddProdCol(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("creator.storefrontAddProduct")}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.target as HTMLFormElement);
              addProduct(addProdCol!, {
                name: f.get("name"),
                description: f.get("description"),
                image_url: f.get("image_url"),
                external_link: f.get("external_link"),
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontProductName")}</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontDescription")}</Label>
              <Textarea name="description" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontImageUrl")}</Label>
              <Input name="image_url" placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("creator.storefrontExternalLink")}</Label>
              <Input name="external_link" placeholder="https://…" />
            </div>
            <Button type="submit" variant="accent" className="w-full rounded-2xl">
              {t("creator.storefrontAddProductButton")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={!!editProd}
        onOpenChange={(o) => {
          if (!o) setEditProd(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("creator.storefrontEditProduct")}
            </DialogTitle>
          </DialogHeader>
          {editProd && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.target as HTMLFormElement);
                updateProduct(editProd.id, {
                  name: f.get("name"),
                  description: f.get("description"),
                  image_url: f.get("image_url"),
                  external_link: f.get("external_link"),
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontProductName")}</Label>
                <Input name="name" defaultValue={editProd.name} required />
              </div>
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontDescription")}</Label>
                <Textarea name="description" rows={2} defaultValue={editProd.description ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontImageUrl")}</Label>
                <Input name="image_url" defaultValue={editProd.image_url ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("creator.storefrontExternalLink")}</Label>
                <Input name="external_link" defaultValue={editProd.external_link ?? ""} />
              </div>
              <Button type="submit" variant="accent" className="w-full rounded-2xl">
                {t("creator.storefrontSave")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== ANALYTICS PAGE ==================== */
function AnalyticsPage({ creatorProfile, creatorId }: { creatorProfile: any; creatorId: string }) {
  const { t } = useT();
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["creator-analytics", creatorId],
    queryFn: async () => {
      const [viewsRes, savesRes, requestsRes, messagesRes, statsRes] = await Promise.all([
        supabase
          .from("profile_views")
          .select("id", { count: "exact", head: true })
          .eq("viewed_id", creatorId),
        supabase.from("saved_creators").select("id, created_at").eq("creator_id", creatorId),
        supabase
          .from("brand_requests")
          .select("id, status, created_at")
          .eq("creator_id", creatorId),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", creatorId),
        supabase.from("creator_stats").select("*").eq("creator_id", creatorId).maybeSingle(),
      ]);

      const saves = savesRes.data ?? [];
      const requests = requestsRes.data ?? [];
      const stats = statsRes.data;

      const profileCompletion = [
        creatorProfile?.display_name,
        creatorProfile?.bio,
        creatorProfile?.avatar_url,
        creatorProfile?.category,
        creatorProfile?.city,
        creatorProfile?.social_link,
        creatorProfile?.website,
      ].filter(Boolean).length;
      const completionPct = Math.min(100, Math.round((profileCompletion / 7) * 100));

      // Real engagement: saves per view ratio, or creator's stored engagement_rate
      const engagementRate = creatorProfile?.engagement_rate
        ? `${creatorProfile.engagement_rate}%`
        : saves.length > 0 && (viewsRes.count ?? 0) > 0
          ? `${((saves.length / (viewsRes.count ?? 1)) * 100).toFixed(1)}%`
          : "—";

      return {
        profileViews: viewsRes.count ?? 0,
        savedByBrands: saves.length,
        collabRequests: requests.length,
        pendingRequests: requests.filter((r: any) => r.status === "pending").length,
        messagesReceived: messagesRes.count ?? 0,
        profileCompletion: completionPct,
        engagementRate,
        storefrontViews: stats?.storefront_views ?? 0,
        portfolioViews: stats?.portfolio_views ?? 0,
        savesThisMonth: saves.filter(
          (s: any) => new Date(s.created_at) > new Date(Date.now() - 30 * 86400000),
        ).length,
        requestsThisMonth: requests.filter(
          (r: any) => new Date(r.created_at) > new Date(Date.now() - 30 * 86400000),
        ).length,
      };
    },
  });

  if (isLoading) return <PageSkeleton />;
  if (!analytics) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">{t("creator.analyticsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("creator.analyticsSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticCard
          label={t("creator.analyticsProfileViews")}
          value={analytics.profileViews}
          icon={Eye}
        />
        <AnalyticCard
          label={t("creator.analyticsSavedByBrands")}
          value={analytics.savedByBrands}
          icon={Heart}
        />
        <AnalyticCard
          label={t("creator.analyticsCollabRequests")}
          value={analytics.collabRequests}
          sub={t("creator.analyticsPending", { count: analytics.pendingRequests })}
          icon={Handshake}
        />
        <AnalyticCard
          label={t("creator.analyticsMessagesReceived")}
          value={analytics.messagesReceived}
          icon={MessageCircle}
        />
        <AnalyticCard
          label={t("creator.analyticsStorefrontViews")}
          value={analytics.storefrontViews}
          icon={Store}
        />
        <AnalyticCard
          label={t("creator.analyticsPortfolioViews")}
          value={analytics.portfolioViews}
          icon={ImageIcon}
        />
        <AnalyticCard
          label={t("creator.analyticsProfileCompletion")}
          value={`${analytics.profileCompletion}%`}
          icon={Activity}
        />
        <AnalyticCard
          label={t("creator.analyticsEngagementRate")}
          value={analytics.engagementRate}
          icon={Activity}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("creator.analyticsThisMonth")}
          </p>
          <p className="mt-3 font-display text-3xl font-semibold">{analytics.savesThisMonth}</p>
          <p className="text-xs text-muted-foreground">{t("creator.analyticsSavedThisMonth")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("creator.analyticsThisMonth")}
          </p>
          <p className="mt-3 font-display text-3xl font-semibold">{analytics.requestsThisMonth}</p>
          <p className="text-xs text-muted-foreground">{t("creator.analyticsRequestsThisMonth")}</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: typeof Eye;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ==================== COLLABORATIONS PAGE ==================== */
function CollaborationsPage({ creatorId, qc }: { creatorId: string; qc: any }) {
  const { t } = useT();
  const navigate = useNavigate();
  const [reviewCol, setReviewCol] = useState<any | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const { data: collaborations = [] } = useQuery({
    queryKey: ["creator-collaborations", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("collaborations")
        .select(
          "*, campaign:campaigns(title, budget_range, deadline), brand:profiles!collaborations_brand_id_fkey(id, display_name, avatar_url, brand_name, email, phone, telegram_url, instagram_url, website)",
        )
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["creator-collab-requests", creatorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_requests")
        .select(
          "*, profiles!brand_requests_sender_id_fkey(id, display_name, avatar_url, brand_name)",
        )
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function setCollabStatus(id: string, status: string) {
    const { error } = await supabase.from("collaborations").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("brand.collaborationStatusUpdated"));
    qc.invalidateQueries({ queryKey: ["creator-collaborations", creatorId] });
  }

  async function setStatus(id: string, status: "accepted" | "rejected") {
    const { data: req } = await supabase
      .from("brand_requests")
      .select("sender_id, brand_name")
      .eq("id", id)
      .single();
    const { error } = await supabase.from("brand_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    if (req) {
      if (status === "accepted") {
        const { error: msgErr } = await supabase.from("messages").insert({
          sender_id: creatorId,
          recipient_id: req.sender_id,
          body: t("toasts.collabStartedMessage", { brand: req.brand_name }),
        });
        if (msgErr) console.error("msg insert error", msgErr);
        await supabase.from("notifications").insert({
          user_id: req.sender_id,
          type: "collaboration_accepted",
          title: t("toasts.notifCollabAcceptedTitle"),
          body: t("toasts.notifCollabAcceptedBody"),
          link: "/brand?page=messages&chat=" + creatorId,
        });
        await supabase.from("notifications").insert({
          user_id: creatorId,
          type: "collaboration_accepted",
          title: t("toasts.notifCollabAcceptedCreatorTitle"),
          body: t("toasts.notifCollabAcceptedCreatorBody"),
          link: "/creator?page=messages&chat=" + req.sender_id,
        });
      } else {
        await supabase.from("notifications").insert({
          user_id: req.sender_id,
          type: "collaboration_declined",
          title: t("toasts.notifCollabRejectedTitle"),
          body: t("toasts.notifCollabRejectedBody", { name: profile?.display_name || "Креатор" }),
          link: "/brand?page=collaborations",
        });
      }
    }
    toast.success(
      status === "accepted"
        ? t("creator.collaborationsAcceptedToast")
        : t("creator.collaborationsDeclinedToast"),
    );
    qc.invalidateQueries({ queryKey: ["creator-collab-requests", creatorId] });
  }

  const pending = requests.filter((r: any) => r.status === "pending");
  const history = requests.filter((r: any) => r.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">{t("creator.collaborationsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("creator.collaborationsSubtitle")}</p>
      </div>

      {/* Active Collaborations (from campaigns) */}
      {collaborations.length > 0 && (
        <section>
          <h3 className="font-display text-lg font-semibold mb-4">
            {t("creator.collaborationsActive")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {collaborations.map((col: any) => (
              <div key={col.id} className="rounded-2xl border border-border bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary/20">
                      {col.brand?.avatar_url ? (
                        <img
                          src={col.brand.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground/30">
                          {(
                            col.brand?.brand_name?.[0] ??
                            col.brand?.display_name?.[0] ??
                            "B"
                          ).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-display text-lg font-semibold">{col.campaign?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("creator.collaborationsBrand")}:{" "}
                        {col.brand?.brand_name || col.brand?.display_name || "—"}
                      </p>
                    </div>
                  </div>
                  <CollaborationStatusBadge status={col.status} t={t} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  {col.campaign?.budget_range && (
                    <div>
                      <p className="font-medium text-foreground/60">
                        {t("brand.collaborationsBudget")}
                      </p>
                      <p className="mt-0.5">{col.campaign.budget_range}</p>
                    </div>
                  )}
                  {col.campaign?.deadline && (
                    <div>
                      <p className="font-medium text-foreground/60">
                        {t("brand.collaborationsDeadline")}
                      </p>
                      <p className="mt-0.5">{col.campaign.deadline}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground/60">
                      {t("brand.collaborationsAcceptedDate")}
                    </p>
                    <p className="mt-0.5">{new Date(col.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-border/40 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {t("brand.collaborationsContactInfo")}:
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                    {col.brand?.id && (
                      <button
                        onClick={async () => {
                          const { data: existing } = await supabase
                            .from("messages")
                            .select("id")
                            .or(
                              `and(sender_id.eq.${creatorId},recipient_id.eq.${col.brand.id}),and(sender_id.eq.${col.brand.id},recipient_id.eq.${creatorId})`,
                            )
                            .limit(1);
                          if (!existing?.length) {
                            await supabase.from("messages").insert({
                              sender_id: creatorId,
                              recipient_id: col.brand.id,
                              body: t("creator.collabMessageIntro", {
                                brand: col.brand?.brand_name || col.brand?.display_name || "",
                              }),
                            });
                          }
                          navigate({
                            to: "/creator",
                            search: { page: "messages", chat: col.brand.id },
                          });
                        }}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" /> {t("creator.collabMessageBtn")}
                      </button>
                    )}
                    {col.brand?.email && (
                      <a
                        href={`mailto:${col.brand.email}`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Send className="h-3 w-3" />
                        {col.brand.email}
                      </a>
                    )}
                    {col.brand?.telegram_url && (
                      <a
                        href={col.brand.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-accent transition-all duration-150 hover:scale-105 hover:shadow-sm hover:cursor-pointer"
                        title="Open Telegram"
                      >
                        <TelegramIcon className="h-[18px] w-[18px] shrink-0" />
                        <span>Telegram</span>
                      </a>
                    )}
                    {col.brand?.instagram_url && (
                      <a
                        href={col.brand.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-accent transition-all duration-150 hover:scale-105 hover:shadow-sm hover:cursor-pointer"
                        title="Open Instagram"
                      >
                        <InstagramIcon className="h-[18px] w-[18px] shrink-0" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {col.brand?.phone && (
                      <a
                        href={`tel:${col.brand.phone}`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Smartphone className="h-3 w-3" />
                        {col.brand.phone}
                      </a>
                    )}
                    {col.brand?.website && (
                      <a
                        href={col.brand.website}
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

                <div className="mt-3 border-t border-border/40 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t("brand.collaborationsStatus")}:
                    </span>
                    <Select
                      defaultValue={col.status}
                      onValueChange={(v) => setCollabStatus(col.id, v)}
                    >
                      <SelectTrigger className="h-7 rounded-xl text-xs w-auto gap-1 border-border/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/60">
                        <SelectItem value="accepted">
                          {t("brand.collaborationStatusAccepted")}
                        </SelectItem>
                        <SelectItem value="in_progress">
                          {t("brand.collaborationStatusInProgress")}
                        </SelectItem>
                        <SelectItem value="content_submitted">
                          {t("brand.collaborationStatusContentSubmitted")}
                        </SelectItem>
                        <SelectItem value="under_review">
                          {t("brand.collaborationStatusUnderReview")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {t("brand.collaborationStatusCompleted")}
                        </SelectItem>
                        <SelectItem value="cancelled">
                          {t("brand.collaborationStatusCancelled")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {col.status === "completed" && (
                  <div className="mt-3 border-t border-border/40 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-xs"
                      onClick={() => {
                        setReviewCol(col);
                        setReviewOpen(true);
                      }}
                    >
                      <Star className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                      {t("trust.rateCollaboration")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <CollaborationReviewModal
            open={reviewOpen}
            onOpenChange={setReviewOpen}
            collaborationId={reviewCol?.id ?? ""}
            targetId={reviewCol?.brand?.id ?? ""}
            targetType="brand"
            reviewerId={creatorId}
            targetName={reviewCol?.brand?.brand_name || reviewCol?.brand?.display_name || ""}
            invalidateKey={["creator-collaborations", creatorId]}
          />
        </section>
      )}

      {/* Pending */}
      <section>
        <h3 className="font-display text-lg font-semibold mb-4">
          {t("creator.collaborationsPending")}{" "}
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning border border-warning/30">
              {pending.length}
            </span>
          )}
        </h3>
        {pending.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-12 text-center text-muted-foreground">
            {t("creator.collaborationsNoPending")}
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((r: any) => (
              <CollaborationCard key={r.id} request={r} onAction={setStatus} />
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h3 className="font-display text-lg font-semibold mb-4">
          {t("creator.collaborationsHistory")}{" "}
          {history.length > 0 && (
            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {history.length}
            </span>
          )}
        </h3>
        {history.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-white p-12 text-center text-muted-foreground">
            {t("creator.collaborationsNoHistory")}
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-secondary/20">
                    {r.profiles?.avatar_url ? (
                      <img
                        src={r.profiles.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-muted-foreground/30">
                        {(r.brand_name?.[0] ?? "B").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{r.brand_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.budget_range} · {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    r.status === "accepted"
                      ? "bg-success/10 text-success border border-success/30"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {r.status === "accepted"
                    ? t("creator.collaborationsAccepted")
                    : t("creator.collaborationsDeclined")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CollaborationStatusBadge({ status, t }: { status: string; t: any }) {
  const map: Record<string, { label: string; cls: string }> = {
    accepted: {
      label: t("brand.collaborationStatusAccepted"),
      cls: "bg-success/10 text-success border border-success/30",
    },
    in_progress: {
      label: t("brand.collaborationStatusInProgress"),
      cls: "bg-blue-50 text-blue-600 border border-blue-200",
    },
    content_submitted: {
      label: t("brand.collaborationStatusContentSubmitted"),
      cls: "bg-warning/10 text-warning border border-warning/30",
    },
    under_review: {
      label: t("brand.collaborationStatusUnderReview"),
      cls: "bg-purple-50 text-purple-600 border border-purple-200",
    },
    completed: {
      label: t("brand.collaborationStatusCompleted"),
      cls: "bg-success/10 text-success border border-success/30",
    },
    cancelled: {
      label: t("brand.collaborationStatusCancelled"),
      cls: "bg-destructive/10 text-destructive",
    },
  };
  const s = map[status] ?? map.accepted;
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function CollaborationCard({
  request,
  onAction,
}: {
  request: any;
  onAction: (id: string, status: "accepted" | "rejected") => void;
}) {
  const { t } = useT();
  let goalMeta: any = {};
  try {
    if (request.goal) goalMeta = JSON.parse(request.goal);
  } catch {
    goalMeta = {};
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary/20">
            {request.profiles?.avatar_url ? (
              <img
                src={request.profiles.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center font-display text-lg text-muted-foreground/30">
                {(request.brand_name?.[0] ?? "B").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-display text-xl font-semibold">
              {goalMeta.campaignName || t("creator.collaborationsRequest")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("creator.collaborationsFrom")}{" "}
              {request.profiles?.display_name || request.brand_name}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {request.budget_range}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(request.created_at).toLocaleDateString()}
          </span>
          <span className="mt-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {request.status}
          </span>
        </div>
      </div>
      {goalMeta.description && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {goalMeta.description}
        </p>
      )}
      {request.message && (
        <p className="mt-2 whitespace-pre-wrap text-sm italic text-muted-foreground/70">
          {request.message}
        </p>
      )}
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span>{t("creator.collaborationsCompany", { name: request.brand_name })}</span>
        {goalMeta.email && (
          <span>{t("creator.collaborationsEmail", { email: goalMeta.email })}</span>
        )}
        {goalMeta.deadline && (
          <span>{t("creator.collaborationsDeadline", { date: goalMeta.deadline })}</span>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="success"
          className="rounded-xl"
          onClick={() => onAction(request.id, "accepted")}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" /> {t("creator.collaborationsAccept")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => onAction(request.id, "rejected")}
        >
          <X className="mr-1.5 h-3.5 w-3.5" /> {t("creator.collaborationsDecline")}
        </Button>
      </div>
    </div>
  );
}

/* ==================== MESSAGES PAGE ==================== */
function MessagesPage({ userId, qc, chatUser }: { userId: string; qc: any; chatUser?: string }) {
  const { t } = useT();
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: chatDeal } = useQuery({
    queryKey: ["chat-deal-status", userId, selectedConversation?.otherId],
    queryFn: async () => {
      if (!userId || !selectedConversation) return null;
      const otherId = selectedConversation.otherId;
      const { data } = await supabase
        .from("deals")
        .select("id, status")
        .or(`and(brand_id.eq.${userId},creator_id.eq.${otherId},status.neq.rejected),and(brand_id.eq.${otherId},creator_id.eq.${userId},status.neq.rejected)`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!userId && !!selectedConversation,
    refetchInterval: 5000,
  });

  const isChatLocked = false;

  async function sendAttachment(file: File) {
    if (!userId || !selectedConversation) return;
    setUploadingFile(true);
    try {
      const fileExt = file.name.split(".").pop() ?? "jpg";
      const fileName = `chat/${selectedConversation.otherId}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("chat_attachments")
        .upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("chat_attachments").getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error("No public URL");
      const attachmentType = file.type.startsWith("video/") ? "video" : file.type === "application/pdf" ? "pdf" : "image";
      const { error: msgErr } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: selectedConversation.otherId,
        body: file.name,
        attachment_url: urlData.publicUrl,
        attachment_type: attachmentType,
      });
      if (msgErr) throw msgErr;
      toast.success(t("common.done"));
      qc.invalidateQueries({ queryKey: ["creator-conversations", userId] });
      qc.invalidateQueries({ queryKey: ["creator-chat", userId, selectedConversation.otherId] });
    } catch (err: any) {
      toast.error(err.message || t("imageUpload.failed"));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const { data: conversations = [] } = useQuery({
    queryKey: ["creator-conversations", userId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data) return [];

      const userIds = new Set<string>();
      for (const m of data) {
        if (m.sender_id !== userId) userIds.add(m.sender_id);
        if (m.recipient_id !== userId) userIds.add(m.recipient_id);
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", [...userIds]);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

      const grouped: Record<string, any> = {};
      for (const msg of data) {
        const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        if (!grouped[otherId])
          grouped[otherId] = {
            otherId,
            otherProfile: profileMap[otherId] ?? null,
            lastMessage: msg,
            unread: 0,
          };
        if (msg.recipient_id === userId && !msg.read_at) grouped[otherId].unread++;
        if (new Date(msg.created_at) > new Date(grouped[otherId].lastMessage.created_at))
          grouped[otherId].lastMessage = msg;
      }
      return Object.values(grouped).sort(
        (a: any, b: any) =>
          new Date(b.lastMessage.created_at).getTime() -
          new Date(a.lastMessage.created_at).getTime(),
      );
    },
  });

  useEffect(() => {
    if (chatUser && conversations.length > 0) {
      const found = conversations.find((c: any) => c.otherId === chatUser);
      if (found) setSelectedConversation(found);
    }
  }, [chatUser, conversations]);

  const { data: chatMessages = [] } = useQuery({
    queryKey: ["creator-chat", userId, selectedConversation?.otherId],
    enabled: !!selectedConversation,
    queryFn: async () => {
      const otherId = selectedConversation.otherId;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;
    const { error: msgErr } = await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: selectedConversation.otherId,
      body: newMessage.trim(),
    });
    if (msgErr) {
      toast.error(msgErr.message);
      return;
    }
    setNewMessage("");

    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: selectedConversation.otherId,
      title: t("brand.notifMessageTitle"),
      body: newMessage.trim().substring(0, 100),
      type: "message",
      link: "/brand?page=messages&chat=" + userId,
    });
    if (notifErr) console.error("notif insert error", notifErr);

    qc.invalidateQueries({ queryKey: ["creator-conversations", userId] });
    qc.invalidateQueries({ queryKey: ["creator-chat", userId, selectedConversation.otherId] });

    // Mark as read
    if (chatMessages.some((m: any) => m.recipient_id === userId && !m.read_at)) {
      const unreadIds = chatMessages
        .filter((m: any) => m.recipient_id === userId && !m.read_at)
        .map((m: any) => m.id);
      for (const id of unreadIds) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", id);
      }
    }
  }

  async function markAsRead(otherId: string) {
    const updates = chatMessages
      .filter((m: any) => m.recipient_id === userId && !m.read_at)
      .map((m: any) =>
        supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id),
      );
    await Promise.all(updates);
    qc.invalidateQueries({ queryKey: ["creator-conversations", userId] });
    qc.invalidateQueries({ queryKey: ["creator-chat", userId, otherId] });
  }

  async function deleteConversation(otherId: string) {
    if (!confirm(t("creator.messagesDeleteConfirm"))) return;
    await supabase
      .from("messages")
      .delete()
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`,
      );
    if (selectedConversation?.otherId === otherId) setSelectedConversation(null);
    qc.invalidateQueries({ queryKey: ["creator-conversations", userId] });
    toast.success(t("creator.messagesDeleted"));
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 -mx-6 -mb-8">
      {/* Conversation List */}
      <div className="w-[340px] shrink-0 border-r border-border/60 overflow-y-auto overflow-x-hidden">
        <div className="p-6 pb-4">
          <h2 className="font-display text-xl font-semibold">{t("creator.messagesTitle")}</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {t("creator.messagesNoConversations")}
          </div>
        ) : (
          <div className="space-y-1 px-3">
            {conversations.map((conv: any) => (
              <button
                key={conv.otherId}
                onClick={() => {
                  setSelectedConversation(conv);
                  markAsRead(conv.otherId);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                  selectedConversation?.otherId === conv.otherId
                    ? "bg-[#F5EDE0]"
                    : "hover:bg-secondary/40"
                }`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary/20">
                  {conv.otherProfile?.avatar_url ? (
                    <img
                      src={conv.otherProfile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground/30">
                      {(conv.otherProfile?.display_name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {conv.otherProfile?.display_name ?? t("creator.messagesUnknown")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                  </span>
                  {conv.unread && <span className="h-2 w-2 rounded-full bg-accent" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-border/60 p-4 px-6">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-secondary/20">
                  {selectedConversation.otherProfile?.avatar_url ? (
                    <img
                      src={selectedConversation.otherProfile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground/30">
                      {(selectedConversation.otherProfile?.display_name?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selectedConversation.otherProfile?.display_name ??
                      t("creator.messagesUnknown")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteConversation(selectedConversation.otherId)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  {t("creator.messagesNoMessages")}
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isMine = msg.sender_id === userId;
                  if (msg.deal_id && selectedConversation) {
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <ProposalChatCard
                          dealId={msg.deal_id}
                          brandId={selectedConversation.otherId}
                          creatorId={userId}
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? "bg-accent text-accent-foreground"
                            : "bg-secondary/40 text-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        {msg.attachment_url && (
                          <div className="mt-2">
                            {msg.attachment_type === "image" ? (
                              <img src={msg.attachment_url} alt={msg.body} className="max-w-full rounded-xl" />
                            ) : msg.attachment_type === "video" ? (
                              <video src={msg.attachment_url} controls className="max-w-full rounded-xl max-h-60" />
                            ) : msg.attachment_type === "link" ? (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline">
                                <FileText className="h-3 w-3" /> {msg.body}
                              </a>
                            ) : (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline">
                                <FileText className="h-3 w-3" /> {msg.body}
                              </a>
                            )}
                          </div>
                        )}
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 ${
                            isMine ? "text-accent-foreground/60" : "text-muted-foreground"
                          }`}
                        >
                          <span className="text-[10px]">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine && msg.read_at && <CheckCheck className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border/60 p-4 px-6">
                <div className="flex gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) sendAttachment(file);
                    }}
                  />
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t("creator.messagesTypeMessage")}
                    className="flex-1 rounded-2xl border-border/60"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={uploadingFile}
                    className="h-10 w-10 shrink-0 rounded-2xl text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    variant="accent"
                    className="rounded-2xl"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
            </div>
          </>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t("creator.messagesSelectConversation")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== NOTIFICATIONS PAGE ==================== */
function NotificationsPage({
  userId,
  qc,
  notifications,
}: {
  userId: string;
  qc: any;
  notifications: any[];
}) {
  const { t } = useT();
  const navigate = useNavigate();
  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-notifications", userId] });
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    qc.invalidateQueries({ queryKey: ["creator-notifications", userId] });
  }

  async function deleteNotif(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-notifications", userId] });
  }

  async function handleClick(n: any) {
    if (!n.read_at) await markRead(n.id);
    const route = getNotificationRoute(n);
    const [path, queryString] = route.split("?");
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const search: Record<string, string> = {};
      for (const [k, v] of params) search[k] = v;
      navigate({ to: path as any, search } as any);
    } else {
      navigate({ to: route } as any);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t("creator.notificationsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("creator.notificationsSubtitle")}</p>
        </div>
        {notifications.some((n: any) => !n.read_at) && (
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={markAllRead}>
            {t("creator.notificationsMarkAllRead")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-white p-20 text-center">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 font-display text-xl">{t("creator.notificationsEmpty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("creator.notificationsEmptyHint")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`group relative rounded-2xl border border-border bg-white p-5 cursor-pointer transition-colors hover:bg-secondary/20 ${n.read_at ? "opacity-60" : ""}`}
              onClick={() => handleClick(n)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!n.read_at && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markRead(n.id);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotif(n.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== RECENT NOTIFICATIONS WIDGET ==================== */
function RecentNotificationsWidget({
  notifications,
  userId,
  qc,
}: {
  notifications: any[];
  userId: string;
  qc: any;
}) {
  const { t } = useT();
  const recent = notifications.slice(0, 5);

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["creator-notifications", userId] });
  }

  if (recent.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {t("creator.sidebarRecentNotifications")}
      </p>
      <div className="mt-3 space-y-2">
        {recent.map((n: any) => (
          <div
            key={n.id}
            className={`flex items-start gap-2 rounded-xl p-2 ${n.read_at ? "" : "bg-accent/5"}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{n.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString()}
              </p>
            </div>
            {!n.read_at && (
              <button onClick={() => markRead(n.id)} className="mt-0.5">
                <Check className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
