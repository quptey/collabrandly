import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useT } from "@/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function NotificationsBell() {
  const { user } = useAuth();
  const { t } = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, qc]);

  if (!user) return null;
  const unread = items.filter((n) => !n.read_at).length;

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user!.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications", user!.id] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-info px-1 text-[10px] font-semibold text-info-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <p className="text-sm font-semibold">{t("notifications.title")}</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-muted-foreground hover:text-foreground">
              {t("dashboard.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
          ) : (
            items.map((n) => (
              <a
                key={n.id}
                href={n.link || "/dashboard"}
                onClick={() => setOpen(false)}
                className={`block border-b border-border/60 px-3 py-3 text-sm last:border-b-0 hover:bg-secondary/40 ${n.read_at ? "opacity-60" : "bg-info/5"}`}
              >
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </a>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}