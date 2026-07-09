import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT, t } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ArrowLeft, FileText, Shield, Users, TrendingUp, AlertCircle, Copy, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: t("trust.fullReportTitle") + " — creator·kz" },
    ],
  }),
  component: ReportPage,
  notFoundComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF8F5]">
        <div className="text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("creatorProfile.notFoundLink")}
          </Link>
        </div>
      </div>
    );
  },
  errorComponent: () => {
    const { t } = useT();
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground bg-[#FAF8F5]">
        {t("creatorProfile.error")}
      </div>
    );
  },
});

function ReportPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: creator, isLoading } = useQuery({
    queryKey: ["creator-report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, completed_deals, complaints_count, audience_quality, audience_gender, audience_age, audience_cities")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Not found");
      return data;
    },
  });

  // Check if already paid
  const { data: existingRequest } = useQuery({
    queryKey: ["report-request", user?.id, id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("report_requests")
        .select("*")
        .eq("brand_id", user!.id)
        .eq("creator_id", id)
        .eq("payment_verified", true)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (existingRequest) {
      navigate({ to: "/report/$id/success", params: { id } });
    }
  }, [existingRequest, navigate, id]);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("report_requests")
      .update({ status: "started_payment" })
      .eq("brand_id", user.id)
      .eq("creator_id", id)
      .eq("status", "clicked")
      .then(({ error }) => {
        if (error) console.error("Failed to update report request:", error);
      });
    trackEvent("report_payment_started", { creatorId: id, method: "page_load" });
  }, [user, id]);

  async function handleSelfPay() {
    if (!user) return;
    if (!phone || phone.length < 10) {
      toast.error(t("trust.phoneRequired"));
      return;
    }
    await supabase
      .from("report_requests")
      .update({
        status: "completed_payment",
        payment_method: "kaspi_transfer",
        payer_phone: phone,
      })
      .eq("brand_id", user.id)
      .eq("creator_id", id);
    trackEvent("report_payment_completed", { creatorId: id, method: "kaspi_transfer", phone });
    navigate({ to: "/report/$id/success", params: { id } });
  }

  async function handleLeaveRequest() {
    if (!user) return;
    await supabase
      .from("report_requests")
      .update({ status: "completed_payment", payment_method: "request" })
      .eq("brand_id", user.id)
      .eq("creator_id", id);
    trackEvent("report_payment_completed", { creatorId: id, method: "request" });
    toast.success(t("trust.reportRequestSent"));
    navigate({ to: "/report/$id/success", params: { id } });
  }

  function copyKaspi() {
    navigator.clipboard.writeText("kaspi.kz/pay/creatorhub");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("trust.linkCopied"));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted-foreground">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="font-display text-3xl">{t("creatorProfile.notFound")}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
          >
            {t("creatorProfile.notFoundLink")}
          </Link>
        </div>
      </div>
    );
  }

  const items = [
    { icon: FileText, label: t("trust.reportDetailHistory") },
    { icon: Shield, label: t("trust.reportDetailComplaints") },
    { icon: Users, label: t("trust.reportDetailAudience") },
    { icon: TrendingUp, label: t("trust.reportDetailRecommendations") },
  ];

  const kaspiNumber = "+7 777 000 0000";

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <SiteHeader />

      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/marketplace"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="h-5 w-5 text-foreground/70" />
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {t("trust.fullReportTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("trust.fullReportDesc")}</p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-warm ring-[3px] ring-white shadow-md">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-display text-xl font-semibold text-foreground/20">
                  {creator.display_name?.[0] ?? "·"}
                </div>
              )}
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{creator.display_name}</p>
              <p className="text-xs text-muted-foreground">{t("trust.fullReportIncludes")}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <h2 className="font-display text-base font-semibold mb-4">
            {t("trust.fullReportIncludes")}
          </h2>
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="pt-1.5 text-sm text-foreground/80">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
              {t("pricing.title")}
            </p>
            <p className="font-display text-3xl font-semibold">{t("trust.reportPrice")}</p>
          </div>
        </div>

        {/* Kaspi QR Payment */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-border/40 mb-5">
          <h3 className="font-display text-base font-semibold mb-3 text-center">
            {t("trust.payViaKaspi")}
          </h3>
          <div className="flex justify-center mb-4">
            <div className="rounded-2xl border-2 border-dashed border-accent/30 bg-accent/5 p-4 text-center">
              <div className="w-48 h-48 mx-auto rounded-xl bg-white flex items-center justify-center border border-border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Kaspi+${encodeURIComponent(kaspiNumber)}+3900KZT`}
                  alt="Kaspi QR"
                  className="w-44 h-44"
                  crossOrigin="anonymous"
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {t("trust.scanKaspiQr")}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-secondary/30 p-4 text-center mb-4">
            <p className="text-xs text-muted-foreground mb-1">{t("trust.orTransferTo")}</p>
            <p className="font-display text-lg font-semibold">{kaspiNumber}</p>
            <Button variant="ghost" size="sm" className="mt-1" onClick={copyKaspi}>
              {copied ? (
                <><CheckCheck className="mr-1 h-3 w-3 text-green-600" />{t("trust.copied")}</>
              ) : (
                <><Copy className="mr-1 h-3 w-3" />{t("trust.copyNumber")}</>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">{t("trust.enterPhoneAfterPayment")}</p>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("trust.yourPhonePlaceholder")}
            />
            <Button className="w-full rounded-2xl h-12 text-base" onClick={handleSelfPay}>
              <Check className="mr-2 h-4 w-4" />
              {t("trust.iHavePaid")}
            </Button>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <Button
            variant="secondary"
            className="w-full rounded-2xl h-12 text-base"
            onClick={handleLeaveRequest}
          >
            {t("trust.reportLeaveRequest")}
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200/60 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700 leading-relaxed">
            {t("trust.reportTracking")}
          </p>
        </div>
      </div>
    </div>
  );
}
