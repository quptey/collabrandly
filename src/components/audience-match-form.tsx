import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AudienceMatchFormProps {
  onPersonaChange: (persona: { gender: string; age: string; city: string } | null) => void;
}

export function AudienceMatchForm({ onPersonaChange }: AudienceMatchFormProps) {
  const { t } = useT();
  const { user } = useAuth();
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("buyer_personas")
      .select("*")
      .eq("brand_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setGender(data.target_gender || "");
          setAge(data.target_age || "");
          setCity(data.target_city || "");
        }
      });
  }, [user?.id]);

  function apply() {
    if (!gender && !age && !city) {
      onPersonaChange(null);
    } else {
      onPersonaChange({ gender, age, city });
    }
  }

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("buyer_personas").upsert(
      {
        brand_id: user.id,
        target_gender: gender,
        target_age: age,
        target_city: city,
      },
      { onConflict: "brand_id" }
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("trust.personaSaved"));
    apply();
  }

  function clear() {
    setGender("");
    setAge("");
    setCity("");
    onPersonaChange(null);
  }

  const hasValues = gender || age || city;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 mb-6">
      <h3 className="font-display text-sm font-semibold mb-2">{t("trust.buyerPersonaTitle")}</h3>
      <p className="text-xs text-muted-foreground mb-3">{t("trust.buyerPersonaDesc")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-28">
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("trust.targetGender")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("trust.any")}</SelectItem>
              <SelectItem value="male">{t("trust.male")}</SelectItem>
              <SelectItem value="female">{t("trust.female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-28">
          <Select value={age} onValueChange={setAge}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={t("trust.targetAge")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("trust.any")}</SelectItem>
              <SelectItem value="18-24">{t("trust.age18_24")}</SelectItem>
              <SelectItem value="25-34">{t("trust.age25_34")}</SelectItem>
              <SelectItem value="35-44">{t("trust.age35_44")}</SelectItem>
              <SelectItem value="45+">{t("trust.age45plus")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t("trust.targetCity")}
          className="h-9 w-32 text-xs"
        />
        <Button size="sm" onClick={save}>
          {t("common.save")}
        </Button>
        {hasValues && (
          <Button size="sm" variant="outline" onClick={clear}>
            {t("marketplace.clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
