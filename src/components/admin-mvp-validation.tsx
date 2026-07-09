import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/loading-skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(a: number, b: number): string {
  if (b === 0 || a === 0) return "0%";
  return ((a / b) * 100).toFixed(1) + "%";
}

interface MvpProps {
  qc: any;
}

export function MvpValidationPanel({ qc }: MvpProps) {
  const { t } = useT();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-mvp-validation"],
    queryFn: async () => {
      const [profilesRes, dealsRes, messagesRes, reviewsRes, reportsRes, eventsRes] =
        await Promise.all([
          supabase.from("profiles").select("id, role, onboarded, created_at"),
          supabase.from("deals").select("id, status, created_at, description, updated_at"),
          supabase.from("messages").select("sender_id, recipient_id, created_at"),
          supabase.from("creator_reviews").select("id, created_at"),
          supabase.from("report_requests").select("id, status, created_at"),
          supabase
            .from("analytics_events")
            .select("event_name, session_id, user_id, created_at")
            .eq("event_name", "visited_site")
            .order("created_at", { ascending: false }),
        ]);

      const profiles = profilesRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const messages = messagesRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      const reports = reportsRes.data ?? [];
      const events = eventsRes.data ?? [];

      // ---- KPIs ----
      const totalVisitors = new Set(events.map((e: any) => e.session_id)).size;
      const creators = profiles.filter((p: any) => p.role === "creator");
      const brands = profiles.filter((p: any) => p.role === "brand");
      const onboarded = profiles.filter((p: any) => p.onboarded === true);
      const conversationPairs = new Set(messages.map((m: any) => [m.sender_id, m.recipient_id].sort().join(":")));
      const proposalsSent = deals.length;
      const proposalsAccepted = deals.filter((d: any) => d.status !== "pending" && d.status !== "rejected").length;
      const inProgress = deals.filter((d: any) => ["confirmed", "first_payment", "work_submitted"].includes(d.status)).length;
      const completed = deals.filter((d: any) => ["completed", "final_payment"].includes(d.status)).length;
      const disputes = deals.filter((d: any) => d.status === "dispute").length;
      const firstPayments = deals.filter((d: any) =>
        ["first_payment", "work_submitted", "completed", "final_payment"].includes(d.status)
      ).length;
      const finalPayments = deals.filter((d: any) => d.status === "final_payment").length;
      const workSubmitted = deals.filter((d: any) =>
        ["work_submitted", "completed", "final_payment"].includes(d.status)
      ).length;

      // ---- Daily aggregations ----
      function byDate(items: any[], dateField: string, filter?: (x: any) => boolean) {
        const map = new Map<string, number>();
        for (const item of items) {
          if (filter && !filter(item)) continue;
          const d = new Date(item[dateField]).toISOString().slice(0, 10);
          map.set(d, (map.get(d) ?? 0) + 1);
        }
        return Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-30)
          .map(([date, count]) => ({ date: date.slice(5), count }));
      }

      const dailyVisitors = byDate(events, "created_at");
      const dailyRegistrations = byDate(profiles, "created_at");
      const dailyProposals = byDate(deals, "created_at");
      const dailyCompleted = byDate(deals, "created_at", (d: any) => ["completed", "final_payment"].includes(d.status));
      const dailyRevenue = byDate(
        reports.filter((r: any) => r.status === "completed_payment"),
        "created_at",
      );

      // ---- Funnel ----
      const funnel = [
        { label: t("admin.mvpVisitors"), value: totalVisitors || events.length },
        { label: t("admin.mvpRegistrations"), value: profiles.length },
        { label: t("admin.mvpCompletedProfiles"), value: onboarded.length },
        { label: t("admin.mvpConversations"), value: conversationPairs.size },
        { label: t("admin.mvpProposalsSent"), value: proposalsSent },
        { label: t("admin.mvpProposalsAccepted"), value: proposalsAccepted },
        { label: t("admin.mvpCollaborationStarted"), value: inProgress + completed + disputes },
        { label: t("admin.mvpWorkSubmitted"), value: workSubmitted },
        { label: t("admin.mvpBrandConfirmed"), value: completed },
        { label: t("admin.mvpCompleted"), value: completed },
        { label: t("admin.mvpReviews"), value: reviews.length },
      ];

      const funnelRates = funnel.slice(0, -1).map((step, i) => ({
        label: `${step.label} → ${funnel[i + 1].label}`,
        rate: pct(funnel[i + 1].value, step.value),
      }));

      // ---- Milestones ----
      function first(items: any[], dateField: string, filter?: (x: any) => boolean): { date: string; name: string } | null {
        const f = filter ? items.filter(filter) : items;
        if (f.length === 0) return null;
        const sorted = [...f].sort((a: any, b: any) => new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime());
        return { date: new Date(sorted[0][dateField]).toLocaleDateString(), name: sorted[0].display_name || sorted[0].id?.slice(0, 8) || "—" };
      }

      const milestones = [
        { key: "firstCreator", value: first(creators, "created_at") },
        { key: "firstBrand", value: first(brands, "created_at") },
        { key: "firstCompletedProfile", value: first(onboarded, "created_at") },
        { key: "firstProposal", value: first(deals, "created_at") },
        { key: "firstAccepted", value: first(deals, "created_at", (d: any) => d.status !== "pending" && d.status !== "rejected") },
        { key: "firstCollaboration", value: first(deals, "created_at", (d: any) => ["confirmed", "first_payment", "work_submitted", "completed", "final_payment", "dispute"].includes(d.status)) },
        { key: "firstCompleted", value: first(deals, "created_at", (d: any) => ["completed", "final_payment"].includes(d.status)) },
        { key: "firstReview", value: first(reviews, "created_at") },
        { key: "firstPaidReport", value: first(reports, "created_at", (r: any) => r.status === "completed_payment") },
      ];

      return {
        kpis: {
          totalVisitors: totalVisitors || events.length,
          registrations: profiles.length,
          creators: creators.length,
          brands: brands.length,
          completedProfiles: onboarded.length,
          conversations: conversationPairs.size,
          proposalsSent,
          proposalsAccepted,
          inProgress,
          completed,
          disputes,
          reviews: reviews.length,
          paidReports: reports.filter((r: any) => r.status === "completed_payment").length,
          firstPayments,
          finalPayments,
          firstSuccessful: completed,
          workSubmitted,
        },
        dailyVisitors,
        dailyRegistrations,
        dailyProposals,
        dailyCompleted,
        dailyRevenue,
        funnel,
        funnelRates,
        milestones,
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <PageSkeleton />;
  if (!data) return <p className="text-sm text-muted-foreground">No data</p>;

  const { kpis, dailyVisitors, dailyRegistrations, dailyProposals, dailyCompleted, dailyRevenue, funnel, funnelRates, milestones } = data;

  function exportCSV() {
    const rows = [
      ["Metric", "Value"],
      ["Total Visitors", kpis.totalVisitors],
      ["Registrations", kpis.registrations],
      ["Creators", kpis.creators],
      ["Brands", kpis.brands],
      ["Completed Profiles", kpis.completedProfiles],
      ["Conversations", kpis.conversations],
      ["Proposals Sent", kpis.proposalsSent],
      ["Proposals Accepted", kpis.proposalsAccepted],
      ["In Progress", kpis.inProgress],
      ["Completed", kpis.completed],
      ["Disputes", kpis.disputes],
      ["Reviews", kpis.reviews],
      ["Paid Reports", kpis.paidReports],
      ["First Payments", kpis.firstPayments],
      ["Final Payments", kpis.finalPayments],
      ["First Successful", kpis.firstSuccessful],
      [""],
      ["Funnel Step", "Count"],
      ...funnel.map((f: any) => [f.label, f.value]),
      [""],
      ["Conversion", "Rate"],
      ...funnelRates.map((r: any) => [r.label, r.rate]),
      [""],
      ["Milestone", "Date"],
      ...milestones.map((m: any) => [m.key, m.value?.date ?? "—"]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mvp-validation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyTable() {
    const lines = [
      "Metric\tValue",
      ...Object.entries(kpis).map(([k, v]) => `${k}\t${v}`),
      "",
      "Funnel",
      ...funnel.map((f: any) => `${f.label}\t${f.value}`),
      "",
      "Conversion Rates",
      ...funnelRates.map((r: any) => `${r.label}\t${r.rate}`),
      "",
      "Milestones",
      ...milestones.map((m: any) => `${m.key}\t${m.value?.date ?? "—"}`),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      // silently done
    });
  }

  const allPaidReports = kpis.paidReports;
  const reportPrice = 3900;
  const totalRevenue = allPaidReports * reportPrice;

  return (
    <div className="space-y-8">
      {/* Header + Export */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold">📊 MVP Validation</h2>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-secondary/40 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={copyTable}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-secondary/40 transition-colors"
          >
            Copy Table
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <KpiCard icon="👥" label={t("admin.mvpVisitors")} value={fmt(kpis.totalVisitors)} />
        <KpiCard icon="👤" label={t("admin.mvpRegistrations")} value={fmt(kpis.registrations)} />
        <KpiCard icon="🎨" label={t("admin.mvpCreators")} value={fmt(kpis.creators)} />
        <KpiCard icon="🏢" label={t("admin.mvpBrands")} value={fmt(kpis.brands)} />
        <KpiCard icon="📝" label={t("admin.mvpCompletedProfiles")} value={fmt(kpis.completedProfiles)} />
        <KpiCard icon="💬" label={t("admin.mvpConversations")} value={fmt(kpis.conversations)} />
        <KpiCard icon="🤝" label={t("admin.mvpProposalsSent")} value={fmt(kpis.proposalsSent)} />
        <KpiCard icon="✅" label={t("admin.mvpProposalsAccepted")} value={fmt(kpis.proposalsAccepted)} />
        <KpiCard icon="🔵" label={t("admin.mvpInProgress")} value={fmt(kpis.inProgress)} />
        <KpiCard icon="🟢" label={t("admin.mvpCompleted")} value={fmt(kpis.completed)} />
        <KpiCard icon="🔴" label={t("admin.mvpDisputes")} value={fmt(kpis.disputes)} />
        <KpiCard icon="⭐" label={t("admin.mvpReviews")} value={fmt(kpis.reviews)} />
        <KpiCard icon="💳" label={t("admin.mvpPaidReports")} value={fmt(kpis.paidReports)} />
        <KpiCard icon="💰" label={t("admin.mvpFirstPayments")} value={fmt(kpis.firstPayments)} />
        <KpiCard icon="💰" label={t("admin.mvpFinalPayments")} value={fmt(kpis.finalPayments)} />
        <KpiCard icon="🏆" label={t("admin.mvpFirstSuccessful")} value={fmt(kpis.firstSuccessful)} />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {t("admin.mvpFunnelTitle")}
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Funnel bars */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 180, right: 40 }}>
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  width={170}
                />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                />
                <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Conversion rates */}
          <div className="space-y-2">
            {funnelRates.map((cr: any) => (
              <div key={cr.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-[11px]">{cr.label}</span>
                <span className="font-semibold text-xs">{cr.rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={t("admin.mvpDailyVisitors")}>
          <BarChart data={dailyVisitors}>
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
            <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title={t("admin.mvpDailyRegistrations")}>
          <BarChart data={dailyRegistrations}>
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
            <Bar dataKey="count" fill="#8B6F4C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title={t("admin.mvpDailyProposals")}>
          <BarChart data={dailyProposals}>
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
            <Bar dataKey="count" fill="#6B8E5A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title={t("admin.mvpDailyCompleted")}>
          <BarChart data={dailyCompleted}>
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
            <Bar dataKey="count" fill="#4A8C5C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title={t("admin.mvpRevenue")}>
          <BarChart data={dailyRevenue.map((d: any) => ({ ...d, revenue: d.count * reportPrice }))}>
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
              formatter={(value: number) => [`${value.toLocaleString()} ₸`, t("admin.mvpRevenue")]}
            />
            <Bar dataKey="revenue" fill="#E8B84B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      {/* Milestones */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          🎯 {t("admin.mvpMilestones")}
        </p>
        <div className="space-y-2">
          {milestones.map((m: any) => (
            <div key={m.key} className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-6 text-center">
                {m.value ? "✅" : "⬜"}
              </span>
              <span className="flex-1">{t(`admin.${m.key}`)}</span>
              <span className="font-medium text-xs text-muted-foreground">
                {m.value ? m.value.date : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue summary */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t("admin.mvpRevenueSummary")}
          </p>
          <p className="font-display text-2xl font-semibold">
            {totalRevenue.toLocaleString()} ₸
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {allPaidReports} {t("admin.mvpReportsSold")} × {reportPrice.toLocaleString()} ₸
        </p>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs mb-1">{icon}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
