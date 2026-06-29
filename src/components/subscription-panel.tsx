import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function SubscriptionPanel() {
  const { user } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const { plan, subscription, isFree, isPro, isBrandPlan, loading, refresh } = useSubscription();

  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("*").order("sort_order");
      return data ?? [];
    },
  });

  if (loading) {
    return <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  const userRole = isBrandPlan ? "brand" : "creator";
  const myPlans = plans.filter((p: any) => p.role === userRole);

  async function switchPlan(planKey: string) {
    if (!user || plan?.key === planKey) return;
    const target = plans.find((p: any) => p.key === planKey);
    if (!target) return;
    const { error } = await supabase
      .from("subscriptions")
      .upsert({ user_id: user.id, plan_id: target.id, status: "active", current_period_start: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success(t("subscription.switchedToast", { name: target.name }));
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold">{plan?.name ?? t("subscription.free")}</p>
            <p className="text-sm text-muted-foreground">
              {plan?.price_monthly && plan.price_monthly > 0 ? `${plan.price_monthly.toLocaleString()} ${t("subscription.monthSuffix")}` : t("subscription.free")}
            </p>
          </div>
        </div>
        {plan?.description && <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>}
      </div>

      <div className="space-y-4">
        <h3 className="font-display text-xl font-semibold">{t("subscription.availablePlans")}</h3>
        {myPlans.map((p: any) => {
          const isCurrent = plan?.key === p.key;
          return (
            <div key={p.id} className={`rounded-3xl border p-8 ${isCurrent ? "border-2 border-foreground bg-foreground text-background" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-semibold">{p.name}</p>
                  <p className="mt-1 text-sm opacity-70">{p.description}</p>
                  <p className="mt-2 font-display text-3xl font-semibold">
                    {p.price_monthly > 0 ? `${p.price_monthly.toLocaleString()} ${t("subscription.monthSuffix")}` : t("subscription.free")}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    onClick={() => switchPlan(p.key)}
                    className={isCurrent ? "" : "shrink-0"}
                    variant={isCurrent ? "secondary" : "default"}
                  >
                    {p.price_monthly === 0 ? t("subscription.startFree") : t("subscription.upgradePro")}
                  </Button>
                )}
                {isCurrent && (
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shrink-0">
                    {t("subscription.current")}
                  </span>
                )}
              </div>
              {p.features?.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {(p.features as string[]).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isCurrent ? "" : "text-accent"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
