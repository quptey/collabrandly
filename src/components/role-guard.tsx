import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

type Role = 'shopper' | 'creator' | 'brand' | 'admin';

export function RoleGuard({
  allowedRoles,
  children,
  fallback,
}: {
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { role, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth", search: { mode: "signin" } }); return; }
    if (role && !allowedRoles.includes(role)) {
      if (role === 'brand') navigate({ to: "/brand" });
      else if (role === 'admin') navigate({ to: "/admin" });
      else navigate({ to: "/dashboard" });
    }
  }, [role, loading, user, allowedRoles, navigate]);

  if (loading) return fallback ?? null;
  if (!user || !role || !allowedRoles.includes(role)) return null;
  return <>{children}</>;
}
