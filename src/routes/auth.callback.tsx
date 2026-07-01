import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";

export const Route = createFileRoute("/auth/callback")({
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useT();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");

    const handleAuth = async () => {
      const validRoles = ["shopper", "creator", "brand"];
      if (roleParam && validRoles.includes(roleParam)) {
        await supabase
          .from("profiles")
          .update({ role: roleParam as any })
          .eq("id", user.id);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.role === "shopper") {
        if (!profile.onboarded) {
          await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
        }
        navigate({ to: "/dashboard" });
      } else if (!profile?.onboarded) {
        navigate({ to: "/onboarding" });
      } else if (profile.role === "brand") {
        navigate({ to: "/brand" });
      } else if (profile.role === "admin") {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/dashboard" });
      }
    };

    handleAuth();
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-accent" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    </div>
  );
}
