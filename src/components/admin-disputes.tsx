import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  AlertTriangle, MessageSquareText, FileText, ExternalLink,
  CheckCircle, XCircle, Shield, Clock, User, File,
  Scale,
} from "lucide-react";

interface AdminDisputesPanelProps {
  qc: any;
}

export function AdminDisputesPanel({ qc }: AdminDisputesPanelProps) {
  const { t } = useT();
  const { user } = useAuth();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState<string | null>(null);
  const [filesOpen, setFilesOpen] = useState<string | null>(null);

  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("*, creator:profiles!deals_creator_id_fkey(id, display_name, avatar_url), brand:profiles!deals_brand_id_fkey(id, display_name, avatar_url)")
        .eq("status", "dispute")
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    refetchInterval: 10000,
  });

  async function saveComment(dealId: string) {
    const comment = comments[dealId];
    if (!comment?.trim()) return;
    const { error } = await supabase
      .from("deals")
      .update({ internal_comment: comment })
      .eq("id", dealId);
    if (error) return toast.error(error.message);
    toast.success(t("admin.commentSaved"));
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  }

  async function resolveDispute(dealId: string, resolution: string, brandId: string, creatorId: string) {
    if (!user) return;
    const { error } = await supabase.rpc("resolve_dispute", {
      p_deal_id: dealId,
      p_resolution: resolution,
      p_admin_id: user.id,
    });
    if (error) {
      const { error: directError } = await supabase
        .from("deals")
        .update({
          status: "completed",
          dispute_resolution: resolution,
          dispute_resolved_by: user.id,
          dispute_resolved_at: new Date().toISOString(),
        })
        .eq("id", dealId);
      if (directError) return toast.error(directError.message);
      if (resolution === "brand_wins") {
        await supabase.rpc("increment_creator_stat", { p_creator_id: creatorId, p_stat: "complaints_count" });
      }
    }
    toast.success(t("admin.disputeResolved"));
    createNotification({
      userId: brandId, type: "dispute_resolved",
      title: t("trust.notifDisputeResolvedTitle"), body: t("trust.notifDisputeResolvedBody"),
      link: `/deal/${dealId}`,
    });
    createNotification({
      userId: creatorId, type: "dispute_resolved",
      title: t("trust.notifDisputeResolvedTitle"), body: t("trust.notifDisputeResolvedBody"),
      link: `/deal/${dealId}`,
    });
    qc.invalidateQueries({ queryKey: ["admin-disputes"] });
  }

  function getDisputeOpener(d: any) {
    if (!d.dispute_opened_by) return "\u2014";
    if (d.dispute_opened_by === d.brand_id) return d.brand?.display_name || "Brand";
    if (d.dispute_opened_by === d.creator_id) return d.creator?.display_name || "Creator";
    return d.dispute_opened_by?.slice(0, 8);
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-2xl font-semibold">{t("admin.disputes")}</h2>
        {disputes.length > 0 && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive border border-destructive/30">
            {disputes.length}
          </span>
        )}
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center text-muted-foreground">
          {t("admin.noDisputes")}
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => (
            <DisputeCard
              key={d.id}
              d={d}
              comments={comments}
              setComments={setComments}
              saveComment={saveComment}
              resolveDispute={resolveDispute}
              expandedDeal={expandedDeal}
              setExpandedDeal={setExpandedDeal}
              chatOpen={chatOpen}
              setChatOpen={setChatOpen}
              filesOpen={filesOpen}
              setFilesOpen={setFilesOpen}
              getDisputeOpener={getDisputeOpener}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DisputeCard({
  d, comments, setComments, saveComment, resolveDispute,
  expandedDeal, setExpandedDeal, chatOpen, setChatOpen,
  filesOpen, setFilesOpen, getDisputeOpener, t,
}: {
  d: any;
  comments: Record<string, string>;
  setComments: any;
  saveComment: (id: string) => void;
  resolveDispute: (id: string, resolution: string, brandId: string, creatorId: string) => void;
  expandedDeal: string | null;
  setExpandedDeal: (id: string | null) => void;
  chatOpen: string | null;
  setChatOpen: (id: string | null) => void;
  filesOpen: string | null;
  setFilesOpen: (id: string | null) => void;
  getDisputeOpener: (d: any) => string;
  t: any;
}) {
  const isExpanded = expandedDeal === d.id;

  return (
    <div className="rounded-2xl border border-destructive/20 bg-card overflow-hidden">
      {/* Header - always visible */}
      <div
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-destructive/5 transition-colors"
        onClick={() => setExpandedDeal(isExpanded ? null : d.id)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{d.title || t("trust.deal")}</span>
            <span className="text-sm text-muted-foreground">
              {d.creator?.display_name} ↔ {d.brand?.display_name}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {d.amount && <span>{d.amount}</span>}
            <span>{t("admin.openedBy")}: {getDisputeOpener(d)}</span>
            {d.deadline && (
              <span>
                <Clock className="inline h-3 w-3 mr-1" />
                {new Date(d.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
            {t("trust.dealStatusDispute")}
          </span>
          {d.dispute_resolution && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
              {d.dispute_resolution}
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-border/40 pt-4">
          {/* Dispute reason */}
          {d.dispute_reason && (
            <div className="rounded-xl bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-destructive mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("admin.disputeReason")}
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{d.dispute_reason}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("admin.openedBy")}: <strong>{getDisputeOpener(d)}</strong>
              </p>
            </div>
          )}

          {/* Deal details */}
          <div className="rounded-xl border border-border/40 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("trust.dealAmount")}</p>
              <p className="font-medium mt-0.5">{d.amount || "\u2014"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("trust.dealDeadline")}</p>
              <p className="font-medium mt-0.5">{d.deadline ? new Date(d.deadline).toLocaleDateString() : "\u2014"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("admin.brand")}</p>
              <p className="font-medium mt-0.5">{d.brand?.display_name || "\u2014"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("admin.creator")}</p>
              <p className="font-medium mt-0.5">{d.creator?.display_name || "\u2014"}</p>
            </div>
          </div>

          {/* Action buttons */}
          {!d.dispute_resolution && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("admin.resolveDispute")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="success"
                  className="rounded-xl"
                  onClick={() => resolveDispute(d.id, "creator_wins", d.brand_id, d.creator_id)}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  {t("admin.creatorWins")}
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => resolveDispute(d.id, "brand_wins", d.brand_id, d.creator_id)}
                >
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  {t("admin.brandWins")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => resolveDispute(d.id, "resolved_without_penalty", d.brand_id, d.creator_id)}
                >
                  <Shield className="mr-1.5 h-4 w-4" />
                  {t("admin.resolvedWithoutPenalty")}
                </Button>
              </div>
            </div>
          )}

          {d.dispute_resolution && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <CheckCircle className="h-4 w-4" />
                {t("admin.disputeResolved")}: {d.dispute_resolution}
              </div>
              {d.dispute_resolved_at && (
                <p className="text-xs text-green-600 mt-1">
                  {new Date(d.dispute_resolved_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* View chat / files */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setChatOpen(chatOpen === d.id ? null : d.id)}
            >
              <MessageSquareText className="mr-1.5 h-4 w-4" />
              {t("admin.viewChat")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => setFilesOpen(filesOpen === d.id ? null : d.id)}
            >
              <File className="mr-1.5 h-4 w-4" />
              {t("admin.viewFiles")}
            </Button>
          </div>

          {/* Chat history */}
          {chatOpen === d.id && <ChatView dealId={d.id} brandId={d.brand_id} creatorId={d.creator_id} t={t} />}

          {/* Files view */}
          {filesOpen === d.id && <FilesView dealId={d.id} brandId={d.brand_id} creatorId={d.creator_id} t={t} />}

          {/* Internal comment */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs font-medium text-muted-foreground">{t("admin.internalComment")}</Label>
            <Textarea
              value={comments[d.id] ?? d.internal_comment ?? ""}
              onChange={(e) => setComments((prev: any) => ({ ...prev, [d.id]: e.target.value }))}
              placeholder={t("admin.commentPlaceholder")}
              rows={2}
            />
            <Button size="sm" variant="outline" onClick={() => saveComment(d.id)}>
              {t("admin.saveComment")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatView({ dealId, brandId, creatorId, t }: { dealId: string; brandId: string; creatorId: string; t: any }) {
  const { data: messages = [] } = useQuery({
    queryKey: ["admin-chat", dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(display_name)")
        .or(`and(sender_id.eq.${brandId},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${brandId})`)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 p-4 text-center text-sm text-muted-foreground">
        {t("admin.noMessages")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 max-h-64 overflow-y-auto">
      <div className="p-3 space-y-2">
        {messages.map((m: any) => (
          <div key={m.id} className="text-sm">
            <span className="text-xs font-medium text-muted-foreground">
              {m.sender?.display_name || "\u2014"}:
            </span>{" "}
            <span className="text-xs">{m.body}</span>
            {m.attachment_url && (
              <span className="ml-1 text-[10px] text-blue-600">
                <FileText className="inline h-3 w-3 mr-0.5" />
                {t("admin.attachment")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilesView({ dealId, brandId, creatorId, t }: { dealId: string; brandId: string; creatorId: string; t: any }) {
  const { data: attachments = [] } = useQuery({
    queryKey: ["admin-files", dealId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("body, attachment_url, attachment_type, created_at, sender:profiles!messages_sender_id_fkey(display_name)")
        .or(`and(sender_id.eq.${brandId},recipient_id.eq.${creatorId}),and(sender_id.eq.${creatorId},recipient_id.eq.${brandId})`)
        .not("attachment_url", "is", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (attachments.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 p-4 text-center text-sm text-muted-foreground">
        {t("admin.noFiles")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40">
      <div className="p-3 space-y-2">
        {attachments.map((a: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {a.attachment_type === "image" ? (
                <img src={a.attachment_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs truncate">{a.body || t("admin.file")}</p>
                <p className="text-[10px] text-muted-foreground">
                  {a.sender?.display_name} · {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <a
              href={a.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button size="sm" variant="ghost">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
