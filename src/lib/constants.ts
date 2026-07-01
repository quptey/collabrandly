export const CATEGORIES = [
  "beauty",
  "fashion",
  "fitness",
  "lifestyle",
  "travel",
  "food",
  "technology",
  "gaming",
  "business",
  "education",
  "music",
  "sports",
  "photography",
  "entertainment",
  "marketing",
  "other",
] as const;
export const CITIES = [
  "Almaty",
  "Astana",
  "Shymkent",
  "Aktau",
  "Aktobe",
  "Atyrau",
  "Karaganda",
  "Kokshetau",
  "Kostanay",
  "Kyzylorda",
  "Oral",
  "Oskemen",
  "Pavlodar",
  "Petropavlovsk",
  "Semey",
  "Taldykorgan",
  "Taraz",
  "Turkistan",
  "Ekibastuz",
  "Rudny",
  "Temirtau",
] as const;
export const FOLLOWER_RANGES = ["1K-10K", "10K-50K", "50K-200K", "200K+"] as const;
export const BUDGET_RANGES = ["< 100K KZT", "100K-500K KZT", "500K-1M KZT", "1M+ KZT"] as const;

export type Category = (typeof CATEGORIES)[number];
export type City = (typeof CITIES)[number];
export type FollowerRange = (typeof FOLLOWER_RANGES)[number];
export type BudgetRange = (typeof BUDGET_RANGES)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  beauty: "Beauty",
  fashion: "Fashion",
  fitness: "Fitness",
  lifestyle: "Lifestyle",
  travel: "Travel",
  food: "Food",
  technology: "Technology",
  gaming: "Gaming",
  business: "Business",
  education: "Education",
  music: "Music",
  sports: "Sports",
  photography: "Photography",
  entertainment: "Entertainment",
  marketing: "Marketing",
  other: "Other",
};

export const SOCIAL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X",
  "Facebook",
  "LinkedIn",
  "Telegram",
  "VK",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORMS_DATA = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "telegram", label: "Telegram" },
  { value: "website", label: "Website" },
] as const;

export type SocialPlatformValue = (typeof SOCIAL_PLATFORMS_DATA)[number]["value"];

export const SOCIAL_PLATFORM_COLUMNS: Record<string, string> = {
  instagram: "instagram_url",
  tiktok: "tiktok_url",
  youtube: "youtube_url",
  x: "x_url",
  facebook: "facebook_url",
  linkedin: "linkedin_url",
  telegram: "telegram_url",
  website: "website",
} as const;

export const SOCIAL_PLATFORM_PREFIXES: Record<string, string | null> = {
  instagram: "https://www.instagram.com/",
  tiktok: "https://www.tiktok.com/@",
  youtube: "https://www.youtube.com/@",
  telegram: "https://t.me/",
  x: "https://x.com/",
  facebook: "https://www.facebook.com/",
  linkedin: "https://www.linkedin.com/in/",
  website: null,
} as const;

export function extractUsername(platform: string, url: string): string {
  const prefix = SOCIAL_PLATFORM_PREFIXES[platform];
  if (!prefix) return url;
  let u = url.trim();
  if (u.startsWith(prefix)) u = u.slice(prefix.length);
  u = u.replace(/\/+$/, "");
  return u;
}

export function buildFullUrl(platform: string, username: string): string {
  const prefix = SOCIAL_PLATFORM_PREFIXES[platform];
  if (!prefix) return username.trim();
  return prefix + username.trim().replace(/^@+/, "");
}

export const COMPENSATION_TYPES = ["fixed", "barter", "commission"] as const;
export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export function getCategoryLabel(
  t: (key: string) => string,
  category: string | null | undefined,
  customCategory?: string | null | undefined,
): string {
  if (!category) return "—";
  if (category === "other" && customCategory) return customCategory;
  const label = t(`category.${category}`);
  return label || category;
}
