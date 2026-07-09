import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { PageSkeleton } from "@/components/loading-skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const FUNNEL_STEPS = [
  "visited_site",
  "user_registered",
  "profile_completed",
  "creator_card_viewed",
  "contact_sent",
  "deal_created",
  "deal_completed",
  "report_payment_completed",
] as const;

const FUNNEL_LABELS: Record<string, string> = {
  visited_site: "Посетители",
  user_registered: "Регистрация",
  profile_completed: "Заполнили профиль",
  creator_card_viewed: "Просмотр карточек",
  contact_sent: "Отправка предложения",
  deal_created: "Создание сделки",
  deal_completed: "Завершённая сделка",
  report_payment_completed: "Покупка отчёта",
};

interface AnalyticsDashboardProps {
  qc: any;
}

export function AdminAnalyticsPanel({ qc }: AnalyticsDashboardProps) {
  const { t } = useT();

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["admin-profiles-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, role, created_at, onboarded")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["admin-analytics-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("event_name, created_at, session_id, user_id")
        .order("created_at", { ascending: false })
        .limit(50000);
      return data ?? [];
    },
  });

  const { data: dealsData = [] } = useQuery({
    queryKey: ["admin-analytics-deals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("status, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: reportRequests = [] } = useQuery({
    queryKey: ["admin-analytics-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_requests")
        .select("status, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const creators = profiles.filter((p: any) => p.role === "creator");
    const brands = profiles.filter((p: any) => p.role === "brand");

    const newToday = profiles.filter((p: any) => new Date(p.created_at) >= today);
    const newWeek = profiles.filter((p: any) => new Date(p.created_at) >= weekAgo);
    const newMonth = profiles.filter((p: any) => new Date(p.created_at) >= monthAgo);

    const profileCompleted = profiles.filter((p: any) => p.onboarded === true);

    const contactSent = events.filter((e: any) => e.event_name === "contact_sent").length;
    const proposalsSent = events.filter((e: any) => e.event_name === "contact_sent").length;
    const dealsCreated = dealsData.length;
    const dealsCompleted = dealsData.filter((d: any) => d.status === "completed").length;
    const complaints = events.filter((e: any) => e.event_name === "complaint_filed").length;
    const reportClicked = events.filter((e: any) => e.event_name === "report_clicked").length;
    const reportPaymentStarted = events.filter((e: any) => e.event_name === "report_payment_started").length;
    const reportPaymentCompleted = events.filter((e: any) => e.event_name === "report_payment_completed").length;

    const visitors = events.filter((e: any) => e.event_name === "visited_site").length;
    const uniqueVisitors = new Set(events.filter((e: any) => e.event_name === "visited_site").map((e: any) => e.session_id)).size;

    return {
      totalUsers: profiles.length,
      creators: creators.length,
      brands: brands.length,
      newToday: newToday.length,
      newWeek: newWeek.length,
      newMonth: newMonth.length,
      visitors,
      uniqueVisitors,
      registrations: profiles.length,
      profileCompleted: profileCompleted.length,
      proposalsSent,
      dealsCreated,
      dealsCompleted,
      complaints,
      reportClicked,
      reportPaymentStarted,
      reportPaymentCompleted,
    };
  }, [profiles, events, dealsData, reportRequests]);

  const funnelData = useMemo(() => {
    const eventCounts: Record<string, number> = {};
    for (const e of events) {
      eventCounts[e.event_name] = (eventCounts[e.event_name] ?? 0) + 1;
    }
    // For profile_completed use profiles.onboarded count
    eventCounts.profile_completed = profiles.filter((p: any) => p.onboarded === true).length;
    eventCounts.user_registered = profiles.length;

    return FUNNEL_STEPS.map((step) => ({
      name: FUNNEL_LABELS[step],
      value: eventCounts[step] ?? 0,
    }));
  }, [events, profiles]);

  const conversionRates = useMemo(() => {
    const rates: { label: string; rate: string }[] = [];
    for (let i = 0; i < funnelData.length - 1; i++) {
      const from = funnelData[i].value;
      const to = funnelData[i + 1].value;
      const rate = from > 0 ? ((to / from) * 100).toFixed(1) : "0.0";
      rates.push({
        label: `${funnelData[i].name} → ${funnelData[i + 1].name}`,
        rate: `${rate}%`,
      });
    }
    return rates;
  }, [funnelData]);

  const dailySignups = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of profiles) {
      const d = new Date(p.created_at).toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [profiles]);

  if (profilesLoading || eventsLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl font-semibold">{t("admin.analytics")}</h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        <MetricCard label={t("admin.totalUsers")} value={metrics.totalUsers} />
        <MetricCard label={t("admin.creators")} value={metrics.creators} />
        <MetricCard label={t("admin.brands")} value={metrics.brands} />
        <MetricCard label={t("admin.newToday")} value={metrics.newToday} />
        <MetricCard label={t("admin.newWeek")} value={metrics.newWeek} />
        <MetricCard label={t("admin.newMonth")} value={metrics.newMonth} />
        <MetricCard label={t("admin.visitors")} value={metrics.visitors} />
        <MetricCard label={t("admin.uniqueVisitors")} value={metrics.uniqueVisitors} />
        <MetricCard label={t("admin.registrations")} value={metrics.registrations} />
        <MetricCard label={t("admin.completedProfiles")} value={metrics.profileCompleted} />
        <MetricCard label={t("admin.dealsCreated")} value={metrics.dealsCreated} />
        <MetricCard label={t("admin.dealsCompleted")} value={metrics.dealsCompleted} />
        <MetricCard label={t("admin.complaints")} value={metrics.complaints} />
        <MetricCard label={t("admin.reportClicks")} value={metrics.reportClicked} />
        <MetricCard label={t("admin.reportPayments")} value={metrics.reportPaymentCompleted} />
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {t("admin.funnelTitle")}
        </p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ left: 140, right: 40 }}>
              <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={12}
                width={130}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="value" fill="var(--accent)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {t("admin.conversionRates")}
        </p>
        <div className="space-y-2">
          {conversionRates.map((cr) => (
            <div key={cr.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{cr.label}</span>
              <span className="font-medium">{cr.rate}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Signups Chart */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
          {t("admin.dailySignups")}
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySignups}>
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
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
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
