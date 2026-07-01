import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Bell, Trash2 } from "lucide-react";
import { useT } from "@/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getNotificationRoute } from "@/lib/notifications";

function relativeTime(
  dateStr: string,
  locale: string,
  t: (key: string, opts?: any) => string,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return t("notifTime.justNow");
  if (mins < 60) return t("notifTime.minutesAgo", { count: mins });
  if (hours < 24) return t("notifTime.hoursAgo", { count: hours });
  if (days === 1) return t("notifTime.yesterday");
  if (days < 7) return t("notifTime.daysAgo", { count: days });
  return new Date(dateStr).toLocaleDateString(
    locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US",
    {
      day: "numeric",
      month: "short",
    },
  );
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { t, i18n } = useT();
  const navigate = useNavigate();
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
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          qc.invalidateQueries({ queryKey: ["creator-notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);

  if (!user) return null;
  const unread = items.filter((n) => !n.read_at).length;

  async function markAll() {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user!.id)
      .is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications", user!.id] });
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user!.id] });
  }

  async function deleteNotif(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user!.id] });
  }

  async function handleClick(n: any) {
    if (!n.read_at) await markRead(n.id);
    const route = getNotificationRoute(n);
    const [path, queryString] = route.split("?");
    if (queryString) {
      const params = new URLSearchParams(queryString);
      const search: Record<string, string> = {};
      for (const [k, v] of params) search[k] = v;
      navigate({ to: path as any, search } as any);
    } else {
      navigate({ to: route } as any);
    }
    setOpen(false);
  }

  const locale = i18n.language ?? "ru";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-info px-1 text-[10px] font-semibold text-info-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{t("notifications.title")}</p>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("dashboard.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-[340px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`group relative border-b border-border/60 last:border-b-0 ${n.read_at ? "" : "bg-info/[0.04]"}`}
              >
                <button
                  onClick={() => handleClick(n)}
                  className={`w-full px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/30 ${n.read_at ? "opacity-60" : ""}`}
                >
                  <p className="font-medium leading-snug">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {relativeTime(n.created_at, locale, t)}
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotif(n.id);
                  }}
                  className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
