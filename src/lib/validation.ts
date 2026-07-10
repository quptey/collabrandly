import { z } from "zod";

export const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", pattern: /instagram\.com\// },
  { value: "tiktok", label: "TikTok", pattern: /tiktok\.com\// },
  { value: "youtube", label: "YouTube", pattern: /youtube\.com\// },
  { value: "x", label: "X (Twitter)", pattern: /x\.com\// },
  { value: "facebook", label: "Facebook", pattern: /facebook\.com\// },
  { value: "linkedin", label: "LinkedIn", pattern: /linkedin\.com\// },
  { value: "telegram", label: "Telegram", pattern: /t\.me\// },
] as const;

export function hasSocialLink(profile: any): boolean {
  return !!(profile?.instagram_url || profile?.tiktok_url || profile?.social_link);
}

export function validateSocialUrl(url: string, platform?: string): string | null {
  if (!url || !url.trim()) return null;
  if (!url.startsWith("http")) return "Must start with http:// or https://";
  if (platform) {
    const pf = SOCIAL_PLATFORMS.find((p) => p.value === platform);
    if (pf && !pf.pattern.test(url)) return `Must be a valid ${pf.label} URL`;
  }
  try {
    new URL(url);
    return null;
  } catch {
    return "Invalid URL";
  }
}

export const socialLinksFields = [
  { name: "instagram_url", label: "Instagram", placeholder: "https://instagram.com/..." },
  { name: "tiktok_url", label: "TikTok", placeholder: "https://tiktok.com/..." },
  { name: "youtube_url", label: "YouTube", placeholder: "https://youtube.com/..." },
  { name: "x_url", label: "X (Twitter)", placeholder: "https://x.com/..." },
  { name: "facebook_url", label: "Facebook", placeholder: "https://facebook.com/..." },
  { name: "linkedin_url", label: "LinkedIn", placeholder: "https://linkedin.com/..." },
  { name: "telegram_url", label: "Telegram", placeholder: "https://t.me/..." },
] as const;

export const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "At least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(6, "At least 6 characters"),
    name: z.string().min(1, "Required"),
    terms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const creatorAppSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(6, "At least 6 characters"),
    phone: z.string().min(1, "Phone is required"),
    socialPlatform: z.string().min(1, "Select a platform"),
    profileLink: z.string().url("Invalid URL").or(z.literal("")),
    terms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const brandAppSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(6, "At least 6 characters"),
    terms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const onboardingCreatorSchema = z.object({
  display_name: z.string().min(1, "Required"),
  bio: z.string().optional(),
  avatar_url: z.string().optional(),
  social_link: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  follower_range: z.string().optional(),
  follower_count: z.number().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
});

export const onboardingBrandSchema = z.object({
  display_name: z.string().min(1, "Required"),
  about: z.string().optional(),
  avatar_url: z.string().optional(),
  social_link: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
  bio: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
});

export const collectionSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  cover_url: z.string().optional(),
});

export const productSchema = z.object({
  title: z.string().min(1, "Required"),
  price: z.number().min(0, "Must be ≥ 0"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  category: z.string().optional(),
  affiliate_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export const brandRequestSchema = z.object({
  brand_name: z.string().min(1, "Required"),
  contact_person: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  campaign_name: z.string().min(1, "Required"),
  budget_range: z.string().min(1, "Required"),
  description: z.string().optional(),
  deadline: z.string().optional(),
  message: z.string().min(1, "Required"),
});

export const campaignSchema = z.object({
  title: z.string().min(1, "Required"),
  brief: z.string().optional(),
  budget_range: z.string().optional(),
  platform: z.string().optional(),
  category: z.string().optional(),
  deliverables: z.string().optional(),
  target_followers: z.string().optional(),
  deadline: z.string().optional(),
  compensation_type: z.string().optional(),
  engagement_rate: z.string().optional(),
});

export const campaignApplicationSchema = z.object({
  message: z.string().min(1, "Required"),
  portfolio: z.string().optional(),
});

export const profileUpdateSchema = z.object({
  display_name: z.string().min(1, "Required"),
  bio: z.string().optional(),
  avatar_url: z.string().optional(),
  social_link: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  follower_range: z.string().optional(),
  follower_count: z.number().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
});
