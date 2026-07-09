import { useState, useRef, useEffect, useCallback } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, CheckCheck } from "lucide-react";

interface DealChatProps {
  dealId: string;
  brandId: string;
  creatorId: string;
  otherPartyName: string;
}

export function DealChat({ dealId, brandId, creatorId, otherPartyName }: DealChatProps) {
  const { user } = useAuth();
  const { t } = useT();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherId = user?.id === brandId ? creatorId : brandId;

  const { data: messages = [] } = useQuery({
    queryKey: ["deal-messages", dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const unreadIds = messages
      .filter((m) => m.recipient_id === user?.id && !m.read_at)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds)
        .then()
        .catch(() => {});
    }
  }, [messages, user?.id]);

  async function sendMessage() {
    if (!user || !text.trim()) return;
    const msg = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: otherId,
      body: msg,
      deal_id: dealId,
    });
    if (error) {
      console.error(error);
      return;
    }
    createNotification({
      userId: otherId,
      type: "message",
      title: t("trust.notifNewMessageTitle"),
      body: msg.substring(0, 100),
      link: `/deal/${dealId}`,
    });
    qc.invalidateQueries({ queryKey: ["deal-messages", dealId] });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const grouped = messages.reduce(
    (acc, m) => {
      const date = new Date(m.created_at).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(m);
      return acc;
    },
    {} as Record<string, typeof messages>,
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            {t("trust.chatNoMessages")}
          </div>
        )}
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center text-[10px] text-muted-foreground/50 py-2">{date}</div>
            {msgs.map((m) => {
              const isMine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-accent text-accent-foreground rounded-br-md"
                        : "bg-secondary/60 text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[9px] opacity-50">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMine && m.read_at && (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border/40 p-3 bg-white">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("trust.chatInputPlaceholder")}
            className="rounded-2xl bg-secondary/30 border-0 h-11"
          />
          <Button
            size="icon"
            className="rounded-full h-11 w-11 shrink-0"
            disabled={!text.trim()}
            onClick={sendMessage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
