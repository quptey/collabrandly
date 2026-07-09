import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";

interface AdminSeedDataPanelProps {
  qc: any;
}

const QUALITY_OPTIONS = ["green", "yellow", "red"];
const GENDER_OPTIONS = ["male", "female", "any"];
const AGE_OPTIONS = ["18-24", "25-34", "35-44", "45+"];

export function AdminSeedDataPanel({ qc }: AdminSeedDataPanelProps) {
  const { t } = useT();
  const [editing, setEditing] = useState<Record<string, any>>({});

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ["admin-seed-creators"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, display_name, completed_deals, complaints_count, audience_quality, audience_gender, audience_age, audience_cities, follower_count, follower_range",
        )
        .eq("role", "creator")
        .order("display_name", { ascending: true })
        .limit(50);
      return data ?? [];
    },
  });

  async function saveCreator(id: string) {
    const vals = editing[id];
    if (!vals) return;
    const { error } = await supabase.from("profiles").update(vals).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("admin.saved"));
    setEditing((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    qc.invalidateQueries({ queryKey: ["admin-seed-creators"] });
  }

  function getEdit(id: string, field: string, fallback: any = "") {
    return editing[id]?.[field] ?? fallback;
  }

  function setEdit(id: string, field: string, value: any) {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [field]: value },
    }));
  }

  if (isLoading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-semibold">{t("admin.seedData")}</h2>
        <p className="text-xs text-muted-foreground">{creators.length} creators</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3">{t("admin.name")}</th>
              <th className="px-3 py-3">{t("admin.completedDeals")}</th>
              <th className="px-3 py-3">{t("admin.complaints")}</th>
              <th className="px-3 py-3">{t("admin.quality")}</th>
              <th className="px-3 py-3">{t("admin.gender")}</th>
              <th className="px-3 py-3">{t("admin.age")}</th>
              <th className="px-3 py-3">{t("admin.cities")}</th>
              <th className="px-3 py-3">{t("admin.followers")}</th>
              <th className="px-3 py-3 text-right">{t("admin.action")}</th>
            </tr>
          </thead>
          <tbody>
            {creators.map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-3 font-medium">{c.display_name}</td>
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="w-16 h-8 text-sm"
                    value={getEdit(c.id, "completed_deals", c.completed_deals ?? 0)}
                    onChange={(e) => setEdit(c.id, "completed_deals", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="w-16 h-8 text-sm"
                    value={getEdit(c.id, "complaints_count", c.complaints_count ?? 0)}
                    onChange={(e) => setEdit(c.id, "complaints_count", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-3">
                  <select
                    className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
                    value={getEdit(c.id, "audience_quality", c.audience_quality ?? "")}
                    onChange={(e) => setEdit(c.id, "audience_quality", e.target.value)}
                  >
                    <option value="">—</option>
                    {QUALITY_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <select
                    className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
                    value={getEdit(c.id, "audience_gender", c.audience_gender ?? "")}
                    onChange={(e) => setEdit(c.id, "audience_gender", e.target.value)}
                  >
                    <option value="">—</option>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <select
                    className="h-8 rounded-md border border-border bg-transparent px-2 text-sm"
                    value={getEdit(c.id, "audience_age", c.audience_age ?? "")}
                    onChange={(e) => setEdit(c.id, "audience_age", e.target.value)}
                  >
                    <option value="">—</option>
                    {AGE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <Input
                    className="w-28 h-8 text-sm"
                    value={getEdit(c.id, "audience_cities", c.audience_cities ?? "")}
                    onChange={(e) => setEdit(c.id, "audience_cities", e.target.value)}
                  />
                </td>
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    className="w-20 h-8 text-sm"
                    value={getEdit(c.id, "follower_count", c.follower_count ?? 0)}
                    onChange={(e) => setEdit(c.id, "follower_count", Number(e.target.value))}
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <Button
                    size="sm"
                    variant={editing[c.id] ? "default" : "outline"}
                    onClick={() => saveCreator(c.id)}
                  >
                    {t("admin.save")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
