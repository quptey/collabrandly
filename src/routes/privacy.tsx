import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useT, t } from "@/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: t("privacy.metaTitle") },
      { name: "description", content: t("privacy.metaDesc") },
    ],
  }),
  component: PrivacyPage,
});

const SECTION_KEYS = [
  "section1",
  "section2",
  "section3",
  "section4",
  "section5",
  "section6",
] as const;

function PrivacyPage() {
  const { t } = useT();
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("privacy.title")}
        </h1>
        <p className="mt-3 text-muted-foreground">{t("privacy.lastUpdated")}</p>

        <div className="mt-12 space-y-10">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {t(`privacy.${key}Title`)}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {t(`privacy.${key}Body`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
