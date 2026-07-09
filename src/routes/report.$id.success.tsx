import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { CheckCircle, ArrowLeft, FileText, Users, TrendingUp, Shield } from "lucide-react";
import { formatFollowers } from "@/lib/utils";

export const Route = createFileRoute("/report/$id/success")({
  component: ReportSuccessPage,
});

function ReportSuccessPage() {
  const { id } = Route.useParams();
  const { t } = useT();

  const { data: creator } = useQuery({
    queryKey: ["creator-report-success", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return data;
    },
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["creator-report-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_reviews")
        .select("*")
        .eq("creator_id", id)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
        </div>
      </div>
    );
  }

  const audienceQualityLabel = creator.audience_quality === "green"
    ? t("trust.audienceGreen")
    : creator.audience_quality === "yellow"
    ? t("trust.audienceYellow")
    : creator.audience_quality === "red"
    ? t("trust.audienceRed")
    : t("trust.noData");

  const completedReviews = reviews.filter((r: any) => r.status === "completed");
  const failedReviews = reviews.filter((r: any) => r.status === "failed");

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <SiteHeader />
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-16">
        <Link
          to="/marketplace"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow mb-6"
        >
          <ArrowLeft className="h-5 w-5 text-foreground/70" />
        </Link>

        <div className="rounded-3xl bg-green-50 border border-green-200 p-4 mb-6 text-center">
          <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
          <p className="mt-2 font-display text-lg font-semibold text-green-800">
            {t("trust.reportReady")}
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-warm">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt={creator.display_name} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-xl font-semibold text-foreground/20">
                  {creator.display_name?.[0] ?? "·"}
                </div>
              )}
            </div>
            <div>
              <p className="font-display text-xl font-semibold">{creator.display_name}</p>
              <p className="text-sm text-muted-foreground">{t("trust.reportGenerated")}</p>
            </div>
          </div>
        </div>

        {/* Reputation */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            {t("trust.reportDetailHistory")}
          </h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl bg-green-50 p-4">
              <p className="font-display text-2xl font-semibold text-green-700">{creator.completed_deals ?? 0}</p>
              <p className="text-xs text-green-600 mt-1">{t("trust.completedDeals", { count: creator.completed_deals ?? 0 })}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="font-display text-2xl font-semibold text-amber-700">{completedReviews.length}</p>
              <p className="text-xs text-amber-600 mt-1">{t("trust.totalReviews")}</p>
            </div>
          </div>
          {failedReviews.length > 0 && (
            <div className="mt-4 rounded-2xl bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">{t("trust.complaints", { count: failedReviews.length })}</p>
              <div className="mt-2 space-y-2">
                {failedReviews.slice(0, 3).map((r: any) => (
                  <p key={r.id} className="text-xs text-red-600">{r.complaint || t("trust.noDetails")}</p>
                ))}
                {failedReviews.length > 3 && (
                  <p className="text-xs text-red-500">+{failedReviews.length - 3} {t("trust.moreComplaints")}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audience */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            {t("trust.reportDetailAudience")}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("trust.audienceQualityLabel")}</span>
              <span className="font-medium">{audienceQualityLabel}</span>
            </div>
            {creator.audience_gender && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("trust.audienceGender")}</span>
                <span className="font-medium">{creator.audience_gender}</span>
              </div>
            )}
            {creator.audience_age && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("trust.audienceAge")}</span>
                <span className="font-medium">{creator.audience_age}</span>
              </div>
            )}
            {creator.audience_cities && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("trust.audienceCities")}</span>
                <span className="font-medium">{creator.audience_cities}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("creatorProfile.followers")}</span>
              <span className="font-medium">{formatFollowers(creator.follower_count ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40">
          <h2 className="font-display text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            {t("trust.reportDetailRecommendations")}
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
              <span className="text-muted-foreground">
                {creator.completed_deals > 0
                  ? t("trust.recPositiveHistory")
                  : t("trust.recNoHistory")}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-muted-foreground">
                {creator.audience_quality === "green"
                  ? t("trust.recAudienceGood")
                  : creator.audience_quality === "yellow"
                  ? t("trust.recAudienceCheck")
                  : t("trust.recAudienceBad")}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-muted-foreground">{t("trust.recCollaborate")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
