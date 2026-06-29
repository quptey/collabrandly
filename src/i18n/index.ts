import { useEffect } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import kk from "./locales/kk.json";

export const SUPPORTED_LOCALES = ["ru", "kk", "en"] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  kk: "Қазақша",
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ru: { translation: ru }, kk: { translation: kk } },
    fallbackLng: ["ru", "kk", "en"],
    lng: "ru",
    supportedLngs: ["en", "ru", "kk"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;

/** SSR-safe direct t() wrapper — bypasses react-i18next context issues */
export function t(key: string, options?: any) {
  return i18n.t(key, options);
}

/** SSR-safe hook — always uses the same initialized instance */
export function useT() {
  return { t: i18n.t.bind(i18n), i18n };
}

export function LanguageHydrator() {
  useEffect(() => {
    const saved = localStorage.getItem("lng");
    if (saved && saved !== i18n.language && i18n.languages.includes(saved)) {
      i18n.changeLanguage(saved);
    }
  }, []);
  return null;
}