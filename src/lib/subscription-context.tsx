import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface PlanLimitations {
  max_collections?: number;
  max_products?: number;
  has_analytics?: boolean;
  priority_ranking?: boolean;
  unlimited_search?: boolean;
  advanced_filters?: boolean;
  unlimited_requests?: boolean;
  campaign_management?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  price_monthly: number;
  currency: string;
  role: "creator" | "brand";
  features: string[];
  limitations: PlanLimitations;
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  plan: SubscriptionPlan;
}

interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  loading: boolean;
  isPro: boolean;
  isBrandPlan: boolean;
  isFree: boolean;
  checkLimit: (
    type: "collections" | "products",
  ) => Promise<{ allowed: boolean; current: number; max: number }>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSubscription() {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:plan_id(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      setSubscription(data as unknown as UserSubscription | null);
    } catch (e) {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubscription();
  }, [user?.id]);

  const plan = subscription?.plan ?? null;

  const isPro = plan?.key === "creator_pro";
  const isBrandPlan = plan?.key === "brand";
  const isFree = plan?.key === "free_creator";

  async function checkLimit(
    type: "collections" | "products",
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    if (!user) return { allowed: false, current: 0, max: 0 };

    const max =
      type === "collections"
        ? (plan?.limitations?.max_collections ?? -1)
        : (plan?.limitations?.max_products ?? -1);

    if (max === -1) return { allowed: true, current: 0, max: -1 };

    const query = supabase
      .from(type === "collections" ? "collections" : "products")
      .select("id", { count: "exact", head: true })
      .eq(type === "collections" ? "creator_id" : "creator_id", user.id);

    const { count } = await query;
    const current = count ?? 0;
    return { allowed: current < max, current, max };
  }

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        loading,
        isPro,
        isBrandPlan,
        isFree,
        checkLimit,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
