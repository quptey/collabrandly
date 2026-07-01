import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useT, t } from "@/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: t("terms.metaTitle") }, { name: "description", content: t("terms.metaDesc") }],
  }),
  component: TermsPage,
});

const SECTION_KEYS = [
  "section1",
  "section2",
  "section3",
  "section4",
  "section5",
  "section6",
] as const;

function TermsPage() {
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
          {t("terms.title")}
        </h1>
        <p className="mt-3 text-muted-foreground">{t("terms.lastUpdated")}</p>

        <div className="mt-12 space-y-10">
          {SECTION_KEYS.map((key) => (
            <section key={key}>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {t(`terms.${key}Title`)}
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t(`terms.${key}Body`)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
