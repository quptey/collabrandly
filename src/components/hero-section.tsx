import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useT } from "@/i18n";
import { Star, TrendingUp, Users, ShoppingBag } from "lucide-react";

const images = {
  main: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&h=1000&fit=crop&crop=face",
  maleCreator: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=600&h=700&fit=crop",
  review: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=120&h=120&fit=crop",
  outfit: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=120&h=120&fit=crop",
  tutorial: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=120&h=120&fit=crop",
  sunglasses: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=120&h=120&fit=crop",
  handbag: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=120&h=120&fit=crop",
  perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=120&h=120&fit=crop",
  earrings: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=120&h=120&fit=crop",
};

export function HeroSection() {
  const { t } = useT();

  const heroLine3 = t("landing.heroLine3").split("|");

  return (
    <section className="bg-[#F8F5F1] overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-6">
        <div className="flex flex-col lg:flex-row min-h-[600px] lg:min-h-[900px] lg:items-center">
          {/* LEFT COLUMN — 45% */}
          <div className="w-full lg:w-[45%] shrink-0 pr-0 lg:pr-10">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex h-[32px] lg:h-[42px] items-center gap-2 rounded-full bg-[#EDE8E1] px-4 lg:px-5 text-[11px] lg:text-sm font-bold text-[#111111]"
            >
              <Star className="h-3 w-3 lg:h-4 lg:w-4 text-[#B69063]" fill="#B69063" />
              {t("landing.heroBadge")}
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-5 lg:mt-7 text-[32px] sm:text-[44px] lg:text-[88px] font-bold leading-[0.95] tracking-tight"
            >
              <span className="text-[#111111]">{t("landing.heroLine1")}</span>
              <br />
              <span className="text-[#111111]">{t("landing.heroLine2")}</span>
              <br />
              <span className="text-[#B69063]">{heroLine3[0]}</span>
              <span className="text-[#111111]">{heroLine3[1]}</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 lg:mt-10 max-w-[500px] text-base sm:text-lg lg:text-2xl leading-relaxed text-[#444444]"
            >
              {t("landing.heroDesc")}
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-6 lg:mt-12 flex flex-col sm:flex-row gap-3 lg:gap-5"
            >
              <Link to="/auth" search={{ mode: "signup", role: "brand" }} className="w-full sm:w-auto">
                <button className="w-full sm:w-[170px] h-14 sm:h-16 rounded-[14px] bg-[#111111] text-white text-sm sm:text-base font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  {t("landing.heroBtnBrand")}
                </button>
              </Link>
              <Link to="/auth" search={{ mode: "signup", role: "creator" }} className="w-full sm:w-auto">
                <button className="w-full sm:w-[170px] h-14 sm:h-16 rounded-[14px] border-2 border-[#111111] bg-white text-[#111111] text-sm sm:text-base font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]">
                  {t("landing.heroBtnCreator")}
                </button>
              </Link>
            </motion.div>
          </div>

          {/* RIGHT COLUMN — 55% */}
          <div className="relative w-full lg:w-[55%] shrink-0 mt-8 lg:mt-0 max-lg:h-[285px] max-lg:overflow-hidden">
            {/* Organic oval container */}
            <div className="relative mx-auto max-lg:scale-[0.38] max-lg:origin-top-left" style={{ width: 850, height: 750 }}>
              {/* Background organic shape */}
              <div className="absolute inset-0 rounded-[300px_300px_200px_200px/400px_400px_250px_250px] bg-gradient-to-br from-[#EDE8E1]/60 via-[#F8F5F1] to-[#E8E0D5]/40" />

              {/* Decorative dots pattern - top right */}
              <div className="absolute right-10 top-8 grid grid-cols-4 gap-2 opacity-20">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
                ))}
              </div>

              {/* Decorative circle - top left */}
              <div className="absolute left-0 top-16 h-32 w-32 rounded-full bg-[#EDE8E1]/50 blur-xl" />
              <div className="absolute bottom-20 right-20 h-24 w-24 rounded-full bg-[#E8D5C0]/30 blur-2xl" />

              {/* MAIN IMAGE — Female creator (top right area) */}
              <div className="absolute right-0 top-0 overflow-hidden rounded-[300px_300px_150px_150px/400px_400px_200px_200px] shadow-2xl" style={{ width: 550, height: 650 }}>
                <img
                  src={images.main}
                  alt={t("landing.heroAltMain")}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/10 to-transparent" />
              </div>

              {/* CARD 1 — Creator Profile (top left, over image) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute -left-2 top-8 w-[320px] rounded-3xl bg-white p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
              >
                <p className="text-sm font-bold text-[#888888]">{t("landing.heroCardProfile")}</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                    <img src={images.main} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#111111]">{t("landing.heroCardName")}</p>
                    <p className="text-sm text-[#666666]">{t("landing.heroCardRole")}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#111111]">{t("landing.heroCardFollowers")}</span>
                  <span className="text-sm text-[#888888]">{t("creatorProfile.followers")}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <div className="flex-1 rounded-xl bg-[#F0EBE5] p-2 text-center">
                    <p className="text-[10px] font-medium text-[#888888]">{t("landing.heroTagProductReview")}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-[#F0EBE5] p-2 text-center">
                    <p className="text-[10px] font-medium text-[#888888]">{t("landing.heroTagOutfit")}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-[#F0EBE5] p-2 text-center">
                    <p className="text-[10px] font-medium text-[#888888]">{t("landing.heroTagBeauty")}</p>
                  </div>
                </div>
              </motion.div>

              {/* CARD 2 — Engagement Rate (top right) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -right-3 top-3 w-[250px] rounded-3xl bg-white p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#888888]">{t("landing.heroCardEngagement")}</p>
                  <TrendingUp className="h-5 w-5 text-[#22C55E]" />
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#111111]">8.7</span>
                  <span className="text-2xl font-bold text-[#111111]">%</span>
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <span className="font-semibold text-[#22C55E]">+2.1%</span>
                  <span className="text-[#888888]">{t("landing.heroCardVsLast")}</span>
                </div>
                {/* Mini bar chart */}
                <div className="mt-3 flex items-end gap-1">
                  {[30, 45, 38, 55, 48, 62, 70, 58, 75, 68, 80, 85].map((h, i) => (
                    <div key={i} className="w-3 rounded-full bg-[#22C55E]/20" style={{ height: h * 0.4 }} />
                  ))}
                </div>
              </motion.div>

              {/* CARD 3 — Brand Collaboration (bottom left) */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute bottom-24 left-0 w-[280px] rounded-3xl bg-white p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-[#888888]">{t("landing.heroCardBrandCollab")}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#111111] text-sm font-bold text-white">NK</div>
                  <div>
                    <p className="text-sm font-bold text-[#111111]">{t("landing.heroCardBrandName")}</p>
                    <p className="text-xs text-[#888888]">{t("landing.heroCardSummerCollab")}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-[#888888]">{t("landing.heroCardReward")}</p>
                  <p className="text-lg font-bold text-[#111111]">₸450,000</p>
                </div>
                <button className="mt-4 h-10 w-full rounded-xl bg-[#111111] text-sm font-semibold text-white transition-colors hover:bg-[#111111]/90">
                  {t("landing.heroCardViewCampaign")}
                </button>
              </motion.div>

              {/* CARD 4 — My Storefront (bottom center) */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[420px] rounded-3xl bg-white p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-[#111111]">{t("landing.heroCardStorefront")}</p>
                    <p className="text-sm text-[#888888]">{t("landing.heroCardProductCount")}</p>
                  </div>
                  <ShoppingBag className="h-5 w-5 text-[#B69063]" />
                </div>
                <div className="mt-4 flex gap-3">
                  {[
                    { label: t("landing.heroProductSunglasses"), img: images.sunglasses },
                    { label: t("landing.heroProductHandbag"), img: images.handbag },
                    { label: t("landing.heroProductPerfume"), img: images.perfume },
                    { label: t("landing.heroProductEarrings"), img: images.earrings },
                  ].map((p, i) => (
                    <div key={i} className="flex-1">
                      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#F0EBE5]">
                        <img src={p.img} alt={p.label} className="h-full w-full object-cover" />
                      </div>
                      <p className="mt-1.5 text-center text-[11px] font-medium text-[#666666]">{p.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* CARD 5 — Male creator (bottom right) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="absolute -right-4 bottom-32 overflow-hidden rounded-[200px_200px_100px_100px/300px_300px_150px_150px] shadow-2xl"
                style={{ width: 350, height: 380 }}
              >
                <img
                  src={images.maleCreator}
                  alt={t("landing.heroAltCreator")}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/10 to-transparent" />
              </motion.div>

              {/* CARD 6 — New Followers (right center) */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute right-2 top-56 w-[260px] rounded-3xl bg-white p-5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
              >
                <p className="text-sm font-semibold text-[#888888]">{t("landing.heroCardNewFollowers")}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#111111]">24.5K</span>
                  <span className="text-sm font-semibold text-[#22C55E]">+18.6%</span>
                </div>
                {/* Bar chart */}
                <div className="mt-4 flex items-end gap-1.5">
                  {[40, 55, 48, 70, 62, 85, 78, 92, 88, 75, 95, 100].map((h, i) => (
                    <div key={i} className="w-3.5 rounded-t-md bg-[#111111]" style={{ height: h * 0.35 }} />
                  ))}
                </div>
              </motion.div>

              {/* CARD 7 — Active Collaborations (bottom right corner) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="absolute -right-2 bottom-6 w-[220px] rounded-3xl bg-white p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F0EBE5]">
                    <Users className="h-5 w-5 text-[#111111]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#111111]">500+</p>
                    <p className="text-sm text-[#888888]">{t("landing.heroCardActiveCollabs")}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
