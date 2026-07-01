import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "shopper" | "creator" | "brand" | "admin";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: any | null;
  role: Role | null;
  isShopper: boolean;
  isCreator: boolean;
  isBrand: boolean;
  isAdmin: boolean;
  verificationStatus: string | null;
  isPending: boolean;
  isApproved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data))
      .catch(() => setProfile(null));
  }, [user?.id]);

  const role = (profile?.role as Role) ?? null;
  const isShopper = role === "shopper";
  const isCreator = role === "creator";
  const isBrand = role === "brand";
  const isAdmin = role === "admin";
  const verificationStatus = profile?.verification_status ?? null;
  const isPending = verificationStatus === "pending";
  const isApproved = verificationStatus === "approved" || verificationStatus === "active";

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isShopper,
        isCreator,
        isBrand,
        isAdmin,
        verificationStatus,
        isPending,
        isApproved,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
