import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT, t } from "@/i18n";
import {
  Users,
  FolderOpen,
  Package,
  Inbox,
  BarChart3,
  Trash2,
  ExternalLink,
  ShieldCheck,
  XCircle,
  CheckCircle,
  Clock,
  Ban,
  Check,
  X,
  Send,
  Flag,
  BadgeCheck,
  TrendingUp,
  FileText,
  AlertTriangle,
  Database,
  PieChart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PageSkeleton } from "@/components/loading-skeleton";
import { AdminAnalyticsPanel } from "@/components/admin-analytics";
import { AdminDisputesPanel } from "@/components/admin-disputes";
import { AdminSeedDataPanel } from "@/components/admin-seed-data";
import { AdminComplaintModerationPanel } from "@/components/admin-complaint-moderation";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: t("admin.metaTitle") }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const [c1, c2, c3] = await Promise.all([
        supabase.from("collections").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("brand_requests").select("id", { count: "exact", head: true }),
      ]);
      return { collections: c1.count ?? 0, products: c2.count ?? 0, requests: c3.count ?? 0 };
    },
  });

  const { data: allCollections = [] } = useQuery({
    queryKey: ["admin-collections"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("collections")
        .select("*, profiles!collections_creator_id_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["admin-products"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "*, collections!products_collection_id_fkey(title), profiles!products_creator_id_fkey(display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const { data: allRequests = [] } = useQuery({
    queryKey: ["admin-requests"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_requests")
        .select("*, profiles!brand_requests_creator_id_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  async function deleteCollection(id: string) {
    if (!confirm(t("admin.confirmDeleteCollection"))) return;
    await supabase.from("products").delete().eq("collection_id", id);
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.collectionDeleted"));
    qc.invalidateQueries({ queryKey: ["admin-collections"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  }

  async function deleteProduct(id: string) {
    if (!confirm(t("admin.confirmDeleteProduct"))) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.productDeleted"));
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  }

  async function deleteRequest(id: string) {
    if (!confirm(t("admin.confirmDeleteRequest"))) return;
    const { error } = await supabase.from("brand_requests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.requestDeleted"));
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  }

  const signupsByWeek = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of profiles) {
      const d = new Date(p.created_at);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, count]) => ({ week: week.slice(5), count }));
  }, [profiles]);

  if (loading || roleLoading)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
          <PageSkeleton />
        </div>
      </div>
    );
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="grid place-items-center px-4 sm:px-6 py-32 text-center">
          <div>
            <h1 className="font-display text-3xl">{t("admin.notAdmin")}</h1>
            <Button variant="outline" className="mt-6" onClick={() => navigate({ to: "/" })}>
              {t("nav.home")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const creators = profiles.filter((p) => p.role === "creator");
  const brands = profiles.filter((p) => p.role === "brand");

  async function toggleApproved(id: string, current: boolean) {
    const { error } = await supabase.from("profiles").update({ approved: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  }

  async function toggleSuspended(id: string, current: boolean) {
    const { error } = await supabase.from("profiles").update({ suspended: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(current ? t("admin.userUnsuspended") : t("admin.userSuspended"));
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
  }

  async function deleteUser(id: string) {
    if (!confirm(t("admin.confirmDeleteUser"))) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.userDeleted"));
    qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    qc.invalidateQueries({ queryKey: ["admin-counts"] });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{t("admin.title")}</h1>

        <Tabs defaultValue="overview" className="mt-10 space-y-8">
          <TabsList className="bg-secondary/40 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="overview">
              <BarChart3 className="mr-2 h-4 w-4" />
              {t("admin.overview")}
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              {t("admin.users")}
            </TabsTrigger>
            <TabsTrigger value="collections">
              <FolderOpen className="mr-2 h-4 w-4" />
              {t("admin.collectionsTab")}
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              {t("admin.productsTab")}
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Inbox className="mr-2 h-4 w-4" />
              {t("admin.requestsTab")}
            </TabsTrigger>
            <TabsTrigger value="verification">
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t("admin.verification")}
            </TabsTrigger>
            <TabsTrigger value="reports">
              <Flag className="mr-2 h-4 w-4" />
              {t("admin.reportsTab")}
            </TabsTrigger>
            <TabsTrigger value="complaintModeration">
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t("admin.complaintModeration")}
            </TabsTrigger>
            <TabsTrigger value="reputation">
              <BadgeCheck className="mr-2 h-4 w-4" />
              {t("admin.adminReputation")}
            </TabsTrigger>
            <TabsTrigger value="audience">
              <Users className="mr-2 h-4 w-4" />
              {t("admin.adminAudienceQuality")}
            </TabsTrigger>
            <TabsTrigger value="deals">
              <FileText className="mr-2 h-4 w-4" />
              {t("admin.adminDeals")}
            </TabsTrigger>
            <TabsTrigger value="paidReports">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t("admin.adminPaidReports")}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <PieChart className="mr-2 h-4 w-4" />
              {t("admin.analytics")}
            </TabsTrigger>
            <TabsTrigger value="disputes">
              <AlertTriangle className="mr-2 h-4 w-4" />
              {t("admin.disputes")}
            </TabsTrigger>
            <TabsTrigger value="seedData">
              <Database className="mr-2 h-4 w-4" />
              {t("admin.seedData")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Metric label={t("admin.totalUsers")} value={profiles.length} icon={Users} />
              <Metric label={t("admin.creators")} value={creators.length} icon={Users} />
              <Metric label={t("admin.brands")} value={brands.length} icon={Users} />
              <Metric
                label={t("admin.collections")}
                value={counts?.collections ?? 0}
                icon={FolderOpen}
              />
              <Metric label={t("admin.products")} value={counts?.products ?? 0} icon={Package} />
              <Metric label={t("admin.requests")} value={counts?.requests ?? 0} icon={Inbox} />
            </div>

            <div className="w-full overflow-hidden rounded-3xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {t("admin.signupsByWeek")}
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={signupsByWeek}>
                    <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="mb-4 flex flex-wrap gap-3">
              <Input placeholder={t("admin.searchPlaceholder")} className="max-w-xs" />
              <Select>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue placeholder={t("admin.allRoles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allRoles")}</SelectItem>
                  <SelectItem value="creator">{t("admin.roleCreator")}</SelectItem>
                  <SelectItem value="brand">{t("admin.roleBrand")}</SelectItem>
                  <SelectItem value="shopper">{t("admin.roleShopper")}</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder={t("admin.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allStatus")}</SelectItem>
                  <SelectItem value="approved">{t("admin.approved")}</SelectItem>
                  <SelectItem value="pending">{t("admin.pending")}</SelectItem>
                  <SelectItem value="rejected">{t("admin.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("admin.name")}</th>
                    <th className="px-4 py-3">{t("admin.role")}</th>
                    <th className="px-4 py-3">{t("admin.city")}</th>
                    <th className="px-4 py-3">{t("admin.status")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{p.display_name}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{p.role}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.city ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${p.suspended ? "bg-destructive/10 text-destructive" : p.approved ? "bg-success/10 text-success border border-success/30" : "bg-secondary text-muted-foreground"}`}
                        >
                          {p.suspended
                            ? t("admin.suspended")
                            : p.approved
                              ? t("admin.approved")
                              : t("admin.pending")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.role === "creator" ? (
                            <Link to="/creator/$id" params={{ id: p.id }}>
                              <Button variant="ghost" size="icon" title={t("admin.viewProfile")}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled
                              title={t("admin.viewProfile")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant={p.approved ? "outline" : "success"}
                            size="sm"
                            onClick={() => toggleApproved(p.id, p.approved)}
                          >
                            {p.approved ? t("admin.unapprove") : t("admin.approve")}
                          </Button>
                          <Button
                            variant={p.suspended ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => toggleSuspended(p.id, p.suspended)}
                          >
                            {p.suspended ? t("admin.unsuspend") : t("admin.suspend")}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteUser(p.id)}>
                            {t("admin.deleteUser")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="collections">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("admin.title")}</th>
                    <th className="px-4 py-3">{t("admin.creator")}</th>
                    <th className="px-4 py-3">{t("admin.date")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allCollections.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        {t("admin.noCollections")}
                      </td>
                    </tr>
                  ) : (
                    allCollections.map((c: any) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{c.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {c.profiles?.display_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to="/creator/$id" params={{ id: c.creator_id }}>
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteCollection(c.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("admin.name")}</th>
                    <th className="px-4 py-3">{t("admin.collectionsTab")}</th>
                    <th className="px-4 py-3">{t("admin.creator")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        {t("admin.noProducts")}
                      </td>
                    </tr>
                  ) : (
                    allProducts.map((p: any) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.collections?.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {p.profiles?.display_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteProduct(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t("admin.brand")}</th>
                    <th className="px-4 py-3">{t("admin.creator")}</th>
                    <th className="px-4 py-3">{t("admin.status")}</th>
                    <th className="px-4 py-3">{t("admin.date")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        {t("admin.noRequests")}
                      </td>
                    </tr>
                  ) : (
                    allRequests.map((r: any) => (
                      <tr key={r.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{r.brand_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.profiles?.display_name ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs capitalize ${r.status === "accepted" ? "bg-success/10 text-success border border-success/30" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {r.creator_id ? (
                              <Link to="/creator/$id" params={{ id: r.creator_id }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={t("admin.viewCreatorProfile")}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            ) : (
                              <Button variant="ghost" size="icon" disabled>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() => deleteRequest(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="verification">
            <VerificationPanel qc={qc} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsPanel qc={qc} />
          </TabsContent>
          <TabsContent value="complaintModeration">
            <AdminComplaintModerationPanel qc={qc} />
          </TabsContent>

          <TabsContent value="reputation">
            <ReputationPanel qc={qc} />
          </TabsContent>

          <TabsContent value="audience">
            <AudiencePanel qc={qc} />
          </TabsContent>

          <TabsContent value="deals">
            <DealsPanel qc={qc} />
          </TabsContent>

          <TabsContent value="paidReports">
            <PaidReportsPanel qc={qc} />
          </TabsContent>
          <TabsContent value="analytics">
            <AdminAnalyticsPanel qc={qc} />
          </TabsContent>
          <TabsContent value="disputes">
            <AdminDisputesPanel qc={qc} />
          </TabsContent>
          <TabsContent value="seedData">
            <AdminSeedDataPanel qc={qc} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function VerificationPanel({ qc }: { qc: any }) {
  const { t } = useT();
  const { user } = useAuth();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Real-time subscription for new applications
  useEffect(() => {
    const channel = supabase
      .channel("admin-applications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "applications" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-applications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pendingProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-pending-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, display_name, email, phone, role, created_at, verification_status, rejection_reason, brand_name, contact_person, website, industry, social_link, avatar_url",
        )
        .in("role", ["creator", "brand"])
        .eq("verification_status", "pending")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [reviewing, setReviewing] = useState<any | null>(null);

  const openReview = useCallback(async (item: any) => {
    if (!item._isOrphan) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("contact_person, industry, brand_name, avatar_url, cover_url, display_name, bio")
        .eq("id", item._userId)
        .single();
      if (prof) {
        item.contact_person = prof.contact_person ?? "";
        item.industry = prof.industry ?? "";
        item.avatar_url = prof.avatar_url ?? "";
        item.cover_url = prof.cover_url ?? "";
        item.bio = prof.bio ?? "";
        item.full_name = item.full_name || prof.display_name;
        item.company_name = item.company_name || prof.brand_name;
      }
    }
    setReviewing(item);
  }, []);

  const isLoading = appsLoading || profilesLoading;

  const pendingApps = applications
    .filter((a) => a.status === "pending")
    .map((a) => ({
      ...a,
      _isOrphan: false,
      _userId: a.user_id,
      _detail: a.role === "brand" ? a.company_name : a.social_link,
    }));
  const appProfileIds = new Set(pendingApps.map((a) => a._userId));
  const orphanPending = pendingProfiles
    .filter((p) => !appProfileIds.has(p.id))
    .map((p) => ({
      id: p.id,
      user_id: p.id,
      role: p.role,
      full_name: p.display_name,
      email: p.email ?? "",
      phone: p.phone ?? "",
      social_link: p.social_link ?? "",
      company_name: p.brand_name ?? "",
      website: p.website ?? "",
      contact_person: p.contact_person ?? "",
      industry: p.industry ?? "",
      avatar_url: p.avatar_url ?? "",
      status: "pending",
      created_at: p.created_at,
      reviewed_at: null,
      rejection_reason: p.rejection_reason ?? "",
      _isOrphan: true,
      _userId: p.id,
      _detail: p.role === "brand" ? (p.brand_name ?? "") : (p.social_link ?? ""),
    }));
  const pending = [...pendingApps, ...orphanPending];
  const approved = applications.filter((a) => a.status === "approved");
  const rejected = applications.filter((a) => a.status === "rejected");

  async function setApplicationStatus(id: string, status: string, reason = "") {
    const now = new Date().toISOString();
    const app = applications.find((a) => a.id === id);
    const orphan = !app ? pending.find((p) => p.id === id && p._isOrphan) : null;

    if (app) {
      const { error: appErr } = await supabase
        .from("applications")
        .update({
          status,
          reviewed_at: now,
          rejection_reason: reason,
          approved_by: status === "approved" ? user?.id : null,
        })
        .eq("id", id);
      if (appErr) return toast.error(appErr.message);
      const profileUpdate: any = { verification_status: status };
      if (status === "rejected") profileUpdate.rejection_reason = reason;
      if (status === "approved") profileUpdate.approved = true;
      await supabase.from("profiles").update(profileUpdate).eq("id", app.user_id);
    } else if (orphan) {
      const profileUpdate: any = { verification_status: status, onboarded: status === "approved" };
      if (status === "rejected") profileUpdate.rejection_reason = reason;
      if (status === "approved") profileUpdate.approved = true;
      const { error: profErr } = await supabase.from("profiles").update(profileUpdate).eq("id", id);
      if (profErr) return toast.error(profErr.message);
      // Also create an applications record for orphan profiles
      await supabase.from("applications").insert({
        user_id: id,
        role: orphan.role,
        full_name: orphan.full_name,
        email: orphan.email,
        phone: orphan.phone,
        company_name: orphan.company_name,
        website: orphan.website,
        social_link: orphan.social_link,
        status,
        reviewed_at: now,
        rejection_reason: reason,
      });
    }

    // Send notification to the user
    await supabase.from("notifications").insert({
      user_id: app ? app.user_id : orphan?._userId,
      title: status === "approved" ? t("admin.notifApprovedTitle") : t("admin.notifRejectedTitle"),
      body:
        status === "approved"
          ? t("admin.notifApprovedBody")
          : reason
            ? t("admin.notifRejectedBodyReason", { reason })
            : t("admin.notifRejectedBody"),
      type: "application_update",
      link: "/dashboard",
    });

    toast.success(
      status === "approved" ? t("admin.applicationApproved") : t("admin.applicationRejected"),
    );
    setRejectId(null);
    setRejectReason("");
    setReviewing(null);
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
    qc.invalidateQueries({ queryKey: ["admin-pending-profiles"] });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-10">
      {/* Pending */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="font-display text-2xl font-semibold">{t("admin.pendingApplications")}</h2>
          <span className="ml-auto rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning border border-warning/30">
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            {t("admin.noPending")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("admin.name")}</th>
                  <th className="px-4 py-3">{t("admin.email")}</th>
                  <th className="px-4 py-3">{t("admin.phone")}</th>
                  <th className="px-4 py-3">{t("admin.role")}</th>
                  <th className="px-4 py-3">{t("admin.details")}</th>
                  <th className="px-4 py-3">{t("admin.date")}</th>
                  <th className="px-4 py-3 text-right">{t("admin.action")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((a) => {
                  const userId = a._userId;
                  return (
                    <tr
                      key={a.id}
                      className="border-t border-border cursor-pointer hover:bg-secondary/20"
                      onClick={() => openReview(a)}
                    >
                      <td className="px-4 py-3 font-medium">{a.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.phone || "—"}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{a.role}</td>
                      <td
                        className="max-w-[180px] truncate px-4 py-3 text-muted-foreground"
                        title={a._detail}
                      >
                        {a._detail || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="outline" onClick={() => openReview(a)}>
                            {t("admin.review")}
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => setApplicationStatus(a.id, "approved")}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            {t("admin.approve")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectId(a.id);
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            {t("admin.reject")}
                          </Button>
                        </div>
                        {rejectId === a.id && (
                          <div
                            className="mt-3 space-y-2 rounded-xl border border-border bg-secondary/20 p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label>{t("admin.rejectionReason")}</Label>
                            <Input
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder={t("admin.rejectionPlaceholder")}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setRejectId(null)}>
                                {t("admin.cancel")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setApplicationStatus(a.id, "rejected", rejectReason)}
                              >
                                {t("admin.confirmReject")}
                              </Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Approved */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h2 className="font-display text-2xl font-semibold">{t("admin.approvedApplications")}</h2>
          <span className="ml-auto rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success border border-success/30">
            {approved.length}
          </span>
        </div>
        {approved.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            {t("admin.noApproved")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("admin.name")}</th>
                  <th className="px-4 py-3">{t("admin.email")}</th>
                  <th className="px-4 py-3">{t("admin.role")}</th>
                  <th className="px-4 py-3">{t("admin.date")}</th>
                  <th className="px-4 py-3">{t("admin.reviewed")}</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{a.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{a.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rejected */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Ban className="h-5 w-5 text-destructive" />
          <h2 className="font-display text-2xl font-semibold">{t("admin.rejectedApplications")}</h2>
          <span className="ml-auto rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            {rejected.length}
          </span>
        </div>
        {rejected.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
            {t("admin.noRejected")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("admin.name")}</th>
                  <th className="px-4 py-3">{t("admin.email")}</th>
                  <th className="px-4 py-3">{t("admin.role")}</th>
                  <th className="px-4 py-3">{t("admin.date")}</th>
                  <th className="px-4 py-3">{t("admin.reviewed")}</th>
                </tr>
              </thead>
              <tbody>
                {rejected.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{a.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{a.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.reviewed_at ? new Date(a.reviewed_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewing}
        onOpenChange={(o) => {
          if (!o) setReviewing(null);
        }}
      >
        <DialogContent className="mx-4 sm:mx-auto max-w-3xl sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("admin.reviewTitle")}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-6">
              {/* Status Badge + Close */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      reviewing.status === "approved"
                        ? "bg-success/10 text-success border border-success/30"
                        : reviewing.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning border border-warning/30"
                    }`}
                  >
                    {reviewing.status === "approved"
                      ? t("admin.approved")
                      : reviewing.status === "rejected"
                        ? t("admin.rejected")
                        : t("admin.pending")}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">{reviewing.role}</span>
                </div>
                <button
                  onClick={() => setReviewing(null)}
                  className="rounded-full p-1.5 hover:bg-secondary/40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Cover Image + Avatar */}
              {reviewing.cover_url && (
                <div className="h-40 w-full overflow-hidden rounded-2xl bg-warm">
                  <img
                    src={reviewing.cover_url}
                    alt={t("admin.coverAlt")}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-warm">
                  {reviewing.avatar_url ? (
                    <img
                      src={reviewing.avatar_url}
                      alt={t("admin.logoAlt")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-2xl font-semibold text-muted-foreground/30">
                      {(reviewing.full_name?.[0] ?? "B").toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold">
                    {reviewing.company_name || reviewing.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {reviewing.role} {t("admin.applicationLabel")}
                  </p>
                </div>
              </div>

              {/* Company Description / Bio */}
              {reviewing.bio && (
                <div className="rounded-2xl border border-border bg-secondary/10 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("admin.companyDescription")}
                  </p>
                  <p className="mt-1.5 text-sm">{reviewing.bio}</p>
                </div>
              )}

              {/* Applicant Information */}
              <div className="rounded-2xl border border-border bg-secondary/10 p-5 space-y-4">
                <h3 className="font-display text-lg font-semibold">{t("admin.applicantInfo")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t("admin.fullName")} value={reviewing.full_name} />
                  <Field label={t("admin.email")} value={reviewing.email} />
                  <Field label={t("admin.phone")} value={reviewing.phone || "—"} />
                  <Field label={t("admin.role")} value={reviewing.role} />
                  <Field
                    label={t("admin.registrationDate")}
                    value={new Date(reviewing.created_at).toLocaleDateString()}
                  />
                  <Field label={t("admin.status")} value={reviewing.status} />
                </div>
              </div>

              {/* Brand Details */}
              {reviewing.role === "brand" && (
                <div className="rounded-2xl border border-border bg-secondary/10 p-5 space-y-4">
                  <h3 className="font-display text-lg font-semibold">{t("admin.brandDetails")}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label={t("admin.companyName")}
                      value={reviewing.company_name || reviewing.full_name}
                    />
                    <Field
                      label={t("admin.contactPerson")}
                      value={reviewing.contact_person || "—"}
                    />
                    <Field label={t("admin.website")} value={reviewing.website || "—"} />
                    <Field label={t("admin.industry")} value={reviewing.industry || "—"} />
                  </div>
                </div>
              )}

              {/* Creator Details */}
              {reviewing.role === "creator" && (
                <div className="rounded-2xl border border-border bg-secondary/10 p-5 space-y-4">
                  <h3 className="font-display text-lg font-semibold">
                    {t("admin.creatorDetails")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t("admin.socialLink")} value={reviewing.social_link || "—"} />
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {reviewing.rejection_reason && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                    {t("admin.rejectionReasonLabel")}
                  </p>
                  <p className="mt-1 text-sm">{reviewing.rejection_reason}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("admin.reviewedOn", {
                      date: reviewing.reviewed_at
                        ? new Date(reviewing.reviewed_at).toLocaleDateString()
                        : "—",
                    })}
                  </p>
                </div>
              )}

              {/* Approve/Reject Actions */}
              {reviewing.status === "pending" && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <Button
                    size="lg"
                    variant="success"
                    className="flex-1 rounded-2xl"
                    onClick={() => setApplicationStatus(reviewing.id, "approved")}
                  >
                    <Check className="mr-2 h-4 w-4" /> {t("admin.approve")}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    className="flex-1 rounded-2xl"
                    onClick={() => setApplicationStatus(reviewing.id, "rejected")}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> {t("admin.reject")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 rounded-2xl"
                    onClick={() => setApplicationStatus(reviewing.id, "request_info")}
                  >
                    <Send className="mr-2 h-4 w-4" /> {t("admin.requestInfo")}
                  </Button>
                </div>
              )}

              {rejectId === reviewing.id && (
                <div className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
                  <Label>{t("admin.rejectionReason")}</Label>
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t("admin.rejectionExplain")}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRejectId(null);
                        setRejectReason("");
                      }}
                    >
                      {t("admin.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setApplicationStatus(reviewing.id, "rejected", rejectReason)}
                    >
                      {t("admin.confirmRejectTitle")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function ReportsPanel({ qc }: { qc: any }) {
  const { t } = useT();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: raw } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      const rows = raw ?? [];
      const ids = new Set<string>();
      rows.forEach((r: any) => {
        ids.add(r.reporter_id);
        ids.add(r.reported_id);
      });
      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", Array.from(ids));
        const map = new Map((profiles ?? []).map((p: any) => [p.id, p.display_name]));
        rows.forEach((r: any) => {
          r._reporterName = map.get(r.reporter_id) ?? "—";
          r._reportedName = map.get(r.reported_id) ?? "—";
        });
      }
      return rows;
    },
  });

  async function markResolved(id: string) {
    const { error } = await supabase.from("reports").update({ status: "resolved" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("admin.reportReporter")}</th>
            <th className="px-4 py-3">{t("admin.reportReported")}</th>
            <th className="px-4 py-3">{t("admin.reportReason")}</th>
            <th className="px-4 py-3">{t("admin.reportDate")}</th>
            <th className="px-4 py-3">{t("admin.reportStatus")}</th>
            <th className="px-4 py-3 text-right">{t("admin.action")}</th>
          </tr>
        </thead>
        <tbody>
          {reports.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                {t("admin.reportsEmpty")}
              </td>
            </tr>
          ) : (
            reports.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r._reporterName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r._reportedName}</td>
                <td className="px-4 py-3 text-muted-foreground">{t(`report.${r.reason}`)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      r.status === "resolved"
                        ? "bg-success/10 text-success border border-success/30"
                        : r.status === "reviewed"
                          ? "bg-warning/10 text-warning border border-warning/30"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {r.status === "resolved"
                      ? t("admin.reportStatusResolved")
                      : r.status === "reviewed"
                        ? t("admin.reportStatusReviewed")
                        : t("admin.reportStatusPending")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {r.user_type === "creator" ? (
                      <Link to="/creator/$id" params={{ id: r.reported_id }}>
                        <Button variant="ghost" size="icon" title={t("admin.reportViewProfile")}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled
                        title={t("admin.reportViewProfile")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {r.status !== "resolved" && (
                      <Button variant="success" size="sm" onClick={() => markResolved(r.id)}>
                        <Check className="mr-1 h-4 w-4" />
                        {t("admin.reportMarkResolved")}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReputationPanel({ qc }: { qc: any }) {
  const { t } = useT();
  const [editing, setEditing] = useState<Record<string, { completed_deals: number; complaints_count: number }>>({});

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["admin-reputation"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, completed_deals, complaints_count")
        .eq("role", "creator")
        .order("display_name", { ascending: true });
      return data ?? [];
    },
  });

  async function saveReputation(id: string) {
    const vals = editing[id];
    if (!vals) return;
    const { error } = await supabase.from("profiles").update(vals).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.saved"));
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    qc.invalidateQueries({ queryKey: ["admin-reputation"] });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("admin.name")}</th>
            <th className="px-4 py-3">{t("admin.completedDeals")}</th>
            <th className="px-4 py-3">{t("admin.complaints")}</th>
            <th className="px-4 py-3 text-right">{t("admin.action")}</th>
          </tr>
        </thead>
        <tbody>
          {creators.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                {t("admin.noCreators")}
              </td>
            </tr>
          ) : (
            creators.map((c: any) => {
              const edit = editing[c.id] ?? { completed_deals: c.completed_deals ?? 0, complaints_count: c.complaints_count ?? 0 };
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.display_name}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={edit.completed_deals}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id] ?? { completed_deals: c.completed_deals ?? 0, complaints_count: c.complaints_count ?? 0 }, completed_deals: Number(e.target.value) } }))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={edit.complaints_count}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id] ?? { completed_deals: c.completed_deals ?? 0, complaints_count: c.complaints_count ?? 0 }, complaints_count: Number(e.target.value) } }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => saveReputation(c.id)}>
                      {t("admin.save")}
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function AudiencePanel({ qc }: { qc: any }) {
  const { t } = useT();
  const [editing, setEditing] = useState<Record<string, { audience_quality: string; audience_gender: string; audience_age: string; audience_cities: string }>>({});

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["admin-audience"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, audience_quality, audience_gender, audience_age, audience_cities")
        .eq("role", "creator")
        .order("display_name", { ascending: true });
      return data ?? [];
    },
  });

  async function saveAudience(id: string) {
    const vals = editing[id];
    if (!vals) return;
    const { error } = await supabase.from("profiles").update(vals).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.saved"));
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
    qc.invalidateQueries({ queryKey: ["admin-audience"] });
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("admin.name")}</th>
            <th className="px-4 py-3">{t("admin.quality")}</th>
            <th className="px-4 py-3">{t("admin.gender")}</th>
            <th className="px-4 py-3">{t("admin.age")}</th>
            <th className="px-4 py-3">{t("admin.cities")}</th>
            <th className="px-4 py-3 text-right">{t("admin.action")}</th>
          </tr>
        </thead>
        <tbody>
          {creators.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                {t("admin.noCreators")}
              </td>
            </tr>
          ) : (
            creators.map((c: any) => {
              const edit = editing[c.id] ?? { audience_quality: c.audience_quality ?? "", audience_gender: c.audience_gender ?? "", audience_age: c.audience_age ?? "", audience_cities: c.audience_cities ?? "" };
              return (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{c.display_name}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={edit.audience_quality}
                      onValueChange={(v) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id] ?? { audience_quality: c.audience_quality ?? "", audience_gender: c.audience_gender ?? "", audience_age: c.audience_age ?? "", audience_cities: c.audience_cities ?? "" }, audience_quality: v } }))}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="green">Green</SelectItem>
                        <SelectItem value="yellow">Yellow</SelectItem>
                        <SelectItem value="red">Red</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={edit.audience_gender}
                      onValueChange={(v) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id] ?? { audience_quality: c.audience_quality ?? "", audience_gender: c.audience_gender ?? "", audience_age: c.audience_age ?? "", audience_cities: c.audience_cities ?? "" }, audience_gender: v } }))}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={edit.audience_age}
                      onValueChange={(v) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id] ?? { audience_quality: c.audience_quality ?? "", audience_gender: c.audience_gender ?? "", audience_age: c.audience_age ?? "", audience_cities: c.audience_cities ?? "" }, audience_age: v } }))}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        <SelectItem value="18-24">18-24</SelectItem>
                        <SelectItem value="25-34">25-34</SelectItem>
                        <SelectItem value="35-44">35-44</SelectItem>
                        <SelectItem value="45+">45+</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      className="w-36 h-8 text-sm"
                      value={edit.audience_cities}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [c.id]: { ...prev[c.id] ?? { audience_quality: c.audience_quality ?? "", audience_gender: c.audience_gender ?? "", audience_age: c.audience_age ?? "", audience_cities: c.audience_cities ?? "" }, audience_cities: e.target.value } }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" onClick={() => saveAudience(c.id)}>
                      {t("admin.save")}
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function DealsPanel({ qc }: { qc: any }) {
  const { t } = useT();

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["admin-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*, profiles!deals_creator_id_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("admin.brand")}</th>
            <th className="px-4 py-3">{t("admin.creator")}</th>
            <th className="px-4 py-3">{t("admin.amount")}</th>
            <th className="px-4 py-3">{t("admin.status")}</th>
            <th className="px-4 py-3">{t("admin.date")}</th>
          </tr>
        </thead>
        <tbody>
          {deals.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                {t("admin.noDeals")}
              </td>
            </tr>
          ) : (
            deals.map((d: any) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{d.brand_name ?? d.brand_id}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.profiles?.display_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {d.amount ? `${d.amount}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs capitalize">
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaidReportsPanel({ qc }: { qc: any }) {
  const { t } = useT();

  const { data: reportRequests = [], isLoading } = useQuery({
    queryKey: ["admin-paid-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_requests")
        .select("*, profiles!report_requests_creator_id_fkey(display_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("admin.brand")}</th>
            <th className="px-4 py-3">{t("admin.creator")}</th>
            <th className="px-4 py-3">{t("admin.status")}</th>
            <th className="px-4 py-3">{t("admin.date")}</th>
          </tr>
        </thead>
        <tbody>
          {reportRequests.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                {t("admin.noPaidReports")}
              </td>
            </tr>
          ) : (
            reportRequests.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{r.brand_name ?? r.brand_id}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.profiles?.display_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs capitalize">
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
