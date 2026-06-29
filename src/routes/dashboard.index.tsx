import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { Plus, Trash2, Pencil, Inbox, FolderOpen, UserCircle2, Bell, Crown, Star, Heart, BadgeCheck, Ban, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { UpgradeModal } from "@/components/upgrade-modal";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, CATEGORY_LABELS, CITIES, FOLLOWER_RANGES, type Category, type City, type FollowerRange } from "@/lib/constants";
import { ImageUpload } from "@/components/image-upload";
import { PageSkeleton } from "@/components/loading-skeleton";
import { SubscriptionPanel } from "@/components/subscription-panel";
import { ErrorBoundary } from "@/components/error-boundary";

import { toast } from "sonner";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, collectionSchema } from "@/lib/validation";

function DashboardErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  console.error("Dashboard error:", error);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Dashboard error</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => reset()}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — creator·kz" }] }),
  component: Dashboard,
  errorComponent: DashboardErrorBoundary,
});

function Dashboard() {
  const { user, loading, role, isShopper, isCreator, isBrand, isAdmin, isPending, isApproved } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useT();
  const { isFree, checkLimit } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeType, setUpgradeType] = useState<"collections" | "products">("collections");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
    if (!loading && role && isBrand) navigate({ to: "/brand" });
    if (!loading && role && isAdmin) navigate({ to: "/admin" });
    if (!loading && role && isCreator) navigate({ to: "/creator" });
  }, [user, loading, role, isBrand, isAdmin, isCreator, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["my-collections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, products(count)")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  async function markNotifRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function markAllNotifRead() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user!.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const { data: requests = [] } = useQuery({
    queryKey: ["my-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_requests")
        .select("*, profiles!brand_requests_sender_id_fkey(id, display_name, avatar_url)")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("brand_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? t("toasts.requestAccepted") : t("toasts.requestRejected"));
    qc.invalidateQueries({ queryKey: ["my-requests"] });
  }

  const [newColOpen, setNewColOpen] = useState(false);
  const colForm = useForm({ resolver: zodResolver(collectionSchema) });
  const { register: colReg, handleSubmit: colHandle, formState: { errors: colErr, isSubmitting: colSub }, setValue: colSet, watch: colWatch, reset: colReset } = colForm;

  async function createCollection(data: { title: string; description?: string; cover_url?: string }) {
    if (isFree) {
      const limit = await checkLimit("collections");
      if (!limit.allowed) {
        setNewColOpen(false);
        setUpgradeType("collections");
        setUpgradeOpen(true);
        return;
      }
    }
    const { data: res, error } = await supabase
      .from("collections")
      .insert({ creator_id: user!.id, title: data.title, description: data.description, cover_url: data.cover_url })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setNewColOpen(false);
    colReset();
    qc.invalidateQueries({ queryKey: ["my-collections"] });
    if (res) navigate({ to: "/dashboard/collection/$id", params: { id: res.id } });
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection?")) return;
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-collections"] });
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-6 py-20"><PageSkeleton /></div>
      </div>
    );
  }

  if (!profile.onboarded) {
    navigate({ to: "/onboarding" });
    return null;
  }

  const isRejected = profile.verification_status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ErrorBoundary>
      <div className="mx-auto max-w-6xl px-6 py-12">
        {isPending && isCreator && (
          <div className="mb-8 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <p className="font-display text-xl font-semibold">{t("dashboard.applicationSubmitted")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dashboard.applicationPendingText")}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning border border-warning/30">
              <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
              {t("dashboard.statusPending")}
            </div>
          </div>
        )}
        {isRejected && (
          <div className="mb-8 rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <p className="font-display text-xl font-semibold">{t("dashboard.applicationRejected")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.rejection_reason
                ? t("dashboard.rejectionReason") + " " + profile.rejection_reason
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
                await supabase.from("profiles").update({
                  verification_status: "pending",
                  rejection_reason: null,
                  approved: false,
                }).eq("id", profile.id);
                const existing = await supabase.from("applications").select("id").eq("user_id", profile.id).maybeSingle();
                if (existing.data) {
                  await supabase.from("applications").update({ status: "pending", rejection_reason: null }).eq("id", existing.data.id);
                }
                toast.success(t("creator.applicationResubmitted"));
                qc.invalidateQueries({ queryKey: ["profile", profile.id] });
              }}
            >
              <Undo2 className="mr-2 h-4 w-4" /> {t("common.resubmit")}
            </Button>
          </div>
        )}

        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("dashboard.welcome")}</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{profile.display_name}</h1>
        </div>

        {isCreator && (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("dashboard.verification")}</p>
              <div className="mt-2 flex items-center gap-2">
                {isPending ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning border border-warning/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />{t("dashboard.statusPending")}
                  </span>
                ) : isApproved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success border border-success/30">
                    <BadgeCheck className="h-3.5 w-3.5" />{t("dashboard.statusAccepted")}
                  </span>
                ) : isRejected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                    <Ban className="h-3.5 w-3.5" />{t("dashboard.statusRejected")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    Draft
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("dashboard.profileViews")}</p>
              <p className="mt-2 font-display text-3xl font-semibold">—</p>
              <p className="text-xs text-muted-foreground">{t("common.comingSoon")}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("dashboard.collaborationRequests")}</p>
              <p className="mt-2 font-display text-3xl font-semibold">{requests.length}</p>
              <p className="text-xs text-muted-foreground">{requests.filter(r => r.status === "pending").length} {t("dashboard.statusPending")}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("dashboard.profileCompletion")}</p>
              <div className="mt-2">
                <p className="font-display text-3xl font-semibold">{Math.min(100, [profile.display_name, profile.bio, profile.avatar_url, profile.category, profile.city, profile.social_link].filter(Boolean).length * 17)}%</p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, [profile.display_name, profile.bio, profile.avatar_url, profile.category, profile.city, profile.social_link].filter(Boolean).length * 17)}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {isCreator && !isPending && !isApproved && (
          <div className="mb-8 rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <p className="font-display text-xl font-semibold">{t("dashboard.submitForVerification")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("dashboard.submitForReviewDesc")}
            </p>
            <Button variant="accent" className="mt-4" onClick={() => {
              supabase.from("profiles").update({ verification_status: "pending" }).eq("id", user!.id).then(() => {
                toast.success(t("dashboard.submittedForReview"));
                qc.invalidateQueries({ queryKey: ["profile"] });
              });
            }}>
              {t("dashboard.submitForReview")}
            </Button>
          </div>
        )}

        {isCreator && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/profile" className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
              <p className="font-display text-sm font-semibold">{t("dashboard.editProfile")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.editProfileDesc")}</p>
            </Link>
            <Link to="/profile" className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
              <p className="font-display text-sm font-semibold">{t("dashboard.accountSettings")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.accountSettingsDesc")}</p>
            </Link>
            <Link to="/marketplace" className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
              <p className="font-display text-sm font-semibold">{t("dashboard.browseMarketplace")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.browseMarketplaceDesc")}</p>
            </Link>
            <Link to="/dashboard" className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-accent/50">
              <p className="font-display text-sm font-semibold">{t("dashboard.viewPublicProfile")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.viewPublicProfileDesc")}</p>
            </Link>
          </div>
        )}

        <Tabs defaultValue={isCreator || isShopper ? "collections" : "requests"} className="space-y-8">
          <TabsList className="bg-secondary/40">
            {(isCreator || isShopper) && <TabsTrigger value="collections"><FolderOpen className="mr-2 h-4 w-4" />{t("dashboard.collections")}</TabsTrigger>}
            {isCreator && !isPending && <TabsTrigger value="requests"><Inbox className="mr-2 h-4 w-4" />{t("dashboard.requests")} {requests.length > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{requests.length}</span>}</TabsTrigger>}
            <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />{t("notifications.title")} {notifications.filter(n => !n.read_at).length > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{notifications.filter(n => !n.read_at).length}</span>}</TabsTrigger>
            <TabsTrigger value="profile"><UserCircle2 className="mr-2 h-4 w-4" />{t("nav.profile")}</TabsTrigger>
            {!isShopper && <TabsTrigger value="subscription"><Crown className="mr-2 h-4 w-4" />{t("nav.subscription")}</TabsTrigger>}
          </TabsList>

          {isShopper && (
            <TabsContent value="collections" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">{t("dashboard.shopperBrowse")}</h2>
              </div>
              <ShopperBrowse />
            </TabsContent>
          )}
          {isCreator && (
            <TabsContent value="collections" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">{t("dashboard.collectionsTitle")}</h2>
                <Button variant="accent" onClick={() => setNewColOpen(true)}><Plus className="mr-2 h-4 w-4" />{t("dashboard.newCollection")}</Button>
              </div>
              {collections.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
                  <p className="font-display text-2xl">{t("dashboard.startFirst")}</p>
                  <p className="mt-2 text-muted-foreground">{t("dashboard.startFirstHint")}</p>
                  <Button variant="accent" onClick={() => setNewColOpen(true)} className="mt-6">{t("dashboard.createCollection")}</Button>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {collections.map((c) => {
                    const count = (c.products as { count: number }[] | null)?.[0]?.count ?? 0;
                    return (
                      <div key={c.id} className="overflow-hidden rounded-3xl border border-border bg-card">
                        <div className="aspect-[16/10] overflow-hidden bg-warm">
                          {c.cover_url ? (
                            <img src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center bg-gradient-to-br from-warm to-cream font-display text-2xl text-foreground/30">{c.title}</div>
                          )}
                        </div>
                        <div className="space-y-3 p-5">
                          <div>
                            <h3 className="font-display text-xl font-semibold leading-tight">{c.title}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{count} {count === 1 ? t("dashboard.product") : t("dashboard.products")}</p>
                          </div>
                          <div className="flex gap-2">
                            <Link to="/dashboard/collection/$id" params={{ id: c.id }} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full"><Pencil className="mr-2 h-3.5 w-3.5" />{t("dashboard.manage")}</Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => deleteCollection(c.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="requests" className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">{t("dashboard.requests")}</h2>
            {requests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
                {t("dashboard.noRequests")} {isCreator && t("dashboard.noRequestsHint")}
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => {
                  let goalMeta: any = {};
                  try { if (r.goal) goalMeta = JSON.parse(r.goal); } catch { goalMeta = {}; }
                  return (
                    <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary/20">
                            {r.profiles?.avatar_url ? (
                              <img src={r.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full place-items-center font-display text-lg text-muted-foreground/30">
                                {r.profiles?.display_name?.[0] ?? "·"}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-display text-xl font-semibold">{goalMeta.campaignName || "Collaboration Request"}</p>
                            <p className="text-sm text-muted-foreground">from {r.profiles?.display_name || r.brand_name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{r.budget_range}</span>
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                          <span className="mt-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{r.status}</span>
                        </div>
                      </div>
                      {goalMeta.description && (
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{goalMeta.description}</p>
                      )}
                      {r.message && (
                        <p className="mt-2 whitespace-pre-wrap text-sm italic text-muted-foreground/70">{r.message}</p>
                      )}
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span>Company: {r.brand_name}</span>
                        {goalMeta.email && <span>Email: {goalMeta.email}</span>}
                        {goalMeta.deadline && <span>Deadline: {goalMeta.deadline}</span>}
                      </div>
                      {isCreator && r.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <Button size="sm" variant="success" onClick={() => setStatus(r.id, "accepted")}>{t("dashboard.accept")}</Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>{t("dashboard.reject")}</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">{t("notifications.title")}</h2>
              {notifications.some(n => !n.read_at) && (
                <Button variant="outline" size="sm" onClick={markAllNotifRead}>{t("notifications.markRead")}</Button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">{t("notifications.empty")}</div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className={`rounded-2xl border border-border bg-card p-5 ${n.read_at ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{n.title}</p>
                        {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                      {!n.read_at && (
                        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => markNotifRead(n.id)}>{t("notifications.markRead")}</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile">
            <ProfileEditor profile={profile} onSaved={() => qc.invalidateQueries({ queryKey: ["profile"] })} />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionPanel />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={newColOpen} onOpenChange={setNewColOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-2xl">{t("dashboard.newCollectionDialog")}</DialogTitle></DialogHeader>
          <form onSubmit={colHandle(createCollection)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="t">{t("dashboard.title")}</Label>
              <Input id="t" {...colReg("title")} placeholder="Winter Essentials" />
              {colErr.title && <p className="text-xs text-destructive">{colErr.title.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d">{t("dashboard.description")}</Label>
              <Textarea id="d" rows={3} {...colReg("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cov">{t("dashboard.coverImageUrl")}</Label>
              <Input id="cov" value={colWatch("cover_url")} onChange={(v) => colSet("cover_url", v.target.value)} placeholder="https://…" />
            </div>
            <Button type="submit" variant="accent" className="w-full" disabled={colSub}>{colSub ? t("dashboard.creating") : t("dashboard.create")}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} type={upgradeType} />
      </ErrorBoundary>
    </div>
  );
}

function ShopperBrowse() {
  const { t } = useT();
  const { data: featured = [] } = useQuery({
    queryKey: ["shopper-browse"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, category, city, follower_range")
        .eq("role", "creator")
        .eq("verification_status", "approved")
        .eq("onboarded", true)
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved-creator-ids"],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_creators")
        .select("creator_id")
        .eq("brand_id", "");
      return (data ?? []).map((s: any) => s.creator_id);
    },
    enabled: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{t("dashboard.featuredCreators")}</h2>
        <Link to="/marketplace">
          <Button variant="outline" size="sm">{t("nav.marketplace")}</Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((c: any) => (
          <Link key={c.id} to="/creator/$id" params={{ id: c.id }}>
            <div className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-accent/50">
              <div className="aspect-square overflow-hidden bg-secondary/20">
                <img src={c.avatar_url || "/placeholder.svg"} alt={c.display_name} className="h-full w-full object-cover" />
              </div>
              <div className="p-4">
                <p className="font-display font-semibold">{c.display_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.category && CATEGORY_LABELS[c.category as Category]}{c.city ? ` · ${c.city}` : ""}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const { t } = useT();
  const isCreator = profile.role === "creator";
  const form = useForm({
    resolver: zodResolver(profileUpdateSchema),
    values: {
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      avatar_url: profile.avatar_url ?? "",
      social_link: profile.social_link ?? "",
      category: profile.category ?? "",
      city: profile.city ?? "",
      follower_range: profile.follower_range ?? "",
      industry: profile.industry ?? "",
    },
  });
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = form;

  async function save(data: any) {
    const payload: TablesUpdate<"profiles"> = {
      display_name: data.display_name, bio: data.bio, avatar_url: data.avatar_url, social_link: data.social_link,
    };
    if (isCreator) {
      payload.category = data.category || null;
      payload.city = data.city || null;
      payload.follower_range = data.follower_range || null;
    }
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    if (error) return toast.error(error.message);
    toast.success(t("dashboard.profileUpdated"));
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit(save)} className="max-w-2xl space-y-6 rounded-3xl border border-border bg-card p-8">
      <h2 className="font-display text-2xl font-semibold">{t("dashboard.editProfileTitle")}</h2>
      <div className="space-y-1.5">
        <Label htmlFor="pn">{isCreator ? t("dashboard.displayName") : t("dashboard.brandName")}</Label>
        <Input id="pn" {...register("display_name")} />
        {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message as string}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pb">{t("dashboard.bio")}</Label>
        <Textarea id="pb" rows={3} {...register("bio")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pa">{t("dashboard.photo")}</Label>
        <ImageUpload value={watch("avatar_url")} onChange={(v) => setValue("avatar_url", v)} folder="avatars" />
      </div>
      {isCreator && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="ps">{t("dashboard.socialLink")}</Label>
            <Input id="ps" {...register("social_link")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{t("dashboard.category")}</Label>
              <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("dashboard.city")}</Label>
              <Select value={watch("city")} onValueChange={(v) => setValue("city", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("dashboard.followers")}</Label>
              <Select value={watch("follower_range")} onValueChange={(v) => setValue("follower_range", v)}>
                <SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger>
                <SelectContent>{FOLLOWER_RANGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
      <Button type="submit" variant="accent" disabled={isSubmitting}>{isSubmitting ? t("dashboard.saving") : t("dashboard.saveChanges")}</Button>
    </form>
  );
}