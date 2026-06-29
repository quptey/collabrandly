import { useT } from "@/i18n";
import { Globe } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function LanguageSwitcher() {
  const { i18n } = useT();
  const { user } = useAuth();
  const current = (i18n.resolvedLanguage as Locale) ?? "ru";

  async function change(l: Locale) {
    await i18n.changeLanguage(l);
    try { localStorage.setItem("lng", l); } catch {}
    if (user) {
      await supabase.from("profiles").update({ locale: l }).eq("id", user.id);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{current.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {SUPPORTED_LOCALES.map((l) => (
          <DropdownMenuItem key={l} onClick={() => change(l)} className={current === l ? "font-semibold" : ""}>
            {LOCALE_LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}