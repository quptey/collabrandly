import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CITIES,
  FOLLOWER_RANGES,
  SOCIAL_PLATFORMS_DATA,
  SOCIAL_PLATFORM_COLUMNS,
  type Category,
  type City,
  type FollowerRange,
} from "@/lib/constants";
import { SocialLinkInput } from "@/components/social-link-input";
import { ImageUpload } from "@/components/image-upload";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingCreatorSchema, onboardingBrandSchema } from "@/lib/validation";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create your storefront — Collabrandly" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { t } = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const isCreator = profile?.role === "creator";

  const form = useForm({
    resolver: zodResolver(isCreator ? onboardingCreatorSchema : onboardingBrandSchema),
    values: {
      display_name: profile?.display_name ?? "",
      bio: profile?.bio ?? "",
      avatar_url: profile?.avatar_url ?? "",
      category: (profile?.category as string) ?? "",
      custom_category: profile?.custom_category ?? "",
      city: (profile?.city as string) ?? "",
      follower_range: (profile?.follower_range as string) ?? "",
      brand_name: profile?.brand_name ?? "",
      contact_person: profile?.contact_person ?? "",
      website: profile?.website ?? "",
      industry: profile?.industry ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form;

  function parseSocialLinks(profile: any): { platform: string; url: string }[] {
    const links: { platform: string; url: string }[] = [];
    for (const [platform, column] of Object.entries(SOCIAL_PLATFORM_COLUMNS)) {
      const val = profile?.[column];
      if (val) links.push({ platform, url: val });
    }
    return links;
  }

  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>(() =>
    parseSocialLinks(profile),
  );
  const [addSocialOpen, setAddSocialOpen] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");

  const addedPlatforms = new Set(socialLinks.map((l) => l.platform));
  const availablePlatforms = SOCIAL_PLATFORMS_DATA.filter((p) => !addedPlatforms.has(p.value));

  function addSocialLink() {
    if (!newSocialPlatform || !newSocialUrl.trim()) return;
    setSocialLinks((prev) => [...prev, { platform: newSocialPlatform, url: newSocialUrl.trim() }]);
    setNewSocialPlatform("");
    setNewSocialUrl("");
    setAddSocialOpen(false);
  }

  function removeSocialLink(platform: string) {
    setSocialLinks((prev) => prev.filter((l) => l.platform !== platform));
  }

  function updateSocialUrl(platform: string, url: string) {
    setSocialLinks((prev) => prev.map((l) => (l.platform === platform ? { ...l, url } : l)));
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (!profile)
    return (
      <div className="grid min-h-screen place-items-center">
        <PageSkeleton />
      </div>
    );

  async function save(data: any) {
    const payload: TablesUpdate<"profiles"> = {
      display_name: data.display_name,
      bio: data.bio,
      avatar_url: data.avatar_url,
      social_link: data.social_link,
      onboarded: true,
    };
    if (isCreator) {
      for (const column of Object.values(SOCIAL_PLATFORM_COLUMNS)) {
        (payload as any)[column] = null;
      }
      for (const link of socialLinks) {
        const column = SOCIAL_PLATFORM_COLUMNS[link.platform];
        if (column) (payload as any)[column] = link.url || null;
      }
      payload.category = data.category || null;
      payload.custom_category = data.category === "other" ? data.custom_category || null : null;
      payload.city = data.city || null;
      payload.follower_range = data.follower_range || null;
    } else {
      payload.brand_name = data.display_name;
      payload.contact_person = data.contact_person;
      payload.website = data.website || null;
      payload.industry = data.industry || null;
    }
    const { error } = await supabase.from("profiles").update(payload).eq("id", user!.id);
    if (error) return toast.error(error.message);

    // Also create/update the applications table record
    const existing = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();
    const appPayload = isCreator
      ? { full_name: data.display_name, social_link: data.social_link || "", company_name: "" }
      : { full_name: data.display_name, company_name: data.display_name, social_link: "" };
    if (existing.data) {
      await supabase
        .from("applications")
        .update({ ...appPayload, status: "pending" })
        .eq("id", existing.data.id);
    } else {
      await supabase.from("applications").insert({
        user_id: user!.id,
        role: isCreator ? "creator" : "brand",
        email: user!.email ?? "",
        phone: profile?.phone ?? "",
        website: data.website || "",
        ...appPayload,
        status: "pending",
      });
    }

    toast.success(t("onboarding.saved"));
    navigate({ to: isCreator ? "/dashboard" : "/brand" });
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {t("onboarding.title")}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {isCreator ? t("onboarding.creatorTitle") : t("onboarding.brandTitle")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isCreator ? t("onboarding.creatorDesc") : t("onboarding.brandDesc")}
        </p>

        <form
          onSubmit={handleSubmit(save)}
          className="mt-10 space-y-4 sm:space-y-6 rounded-3xl border border-border bg-card p-4 sm:p-8"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">
              {isCreator ? t("onboarding.fullName") : t("onboarding.brandName")}
            </Label>
            <Input id="name" {...register("display_name")} />
            {errors.display_name && (
              <p className="text-xs text-destructive">{errors.display_name.message as string}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">{isCreator ? t("onboarding.bio") : t("onboarding.about")}</Label>
            <Textarea
              id="bio"
              rows={3}
              {...register("bio")}
              placeholder={
                isCreator
                  ? t("onboarding.bioPlaceholderCreator")
                  : t("onboarding.bioPlaceholderBrand")
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar">{t("onboarding.profilePhoto")}</Label>
            <ImageUpload
              value={watch("avatar_url")}
              onChange={(v) => setValue("avatar_url", v)}
              folder="avatars"
            />
          </div>
          {isCreator ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h3 className="font-display text-base font-semibold">
                  {t("onboarding.socialLinks")}
                </h3>
                <p className="text-xs text-muted-foreground">{t("onboarding.socialHint")}</p>
                {socialLinks.map((link) => (
                  <div key={link.platform} className="group flex items-center gap-2">
                    <SocialLinkInput
                      platform={link.platform}
                      value={link.url}
                      onChange={(url) => updateSocialUrl(link.platform, url)}
                      onRemove={() => removeSocialLink(link.platform)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialLink(link.platform)}
                      className="shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {availablePlatforms.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddSocialOpen(true)}
                    className="rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" /> {t("onboarding.socialAddNew")}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("onboarding.socialAllAdded")}</p>
                )}
              </div>

              {/* Add Social Network Dialog */}
              <Dialog open={addSocialOpen} onOpenChange={setAddSocialOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl">
                      {t("onboarding.socialAddNew")}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>{t("onboarding.socialSelectPlatform")}</Label>
                      <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("onboarding.socialSelectPlatform")} />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlatforms.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {newSocialPlatform && (
                      <SocialLinkInput
                        platform={newSocialPlatform}
                        value={newSocialUrl}
                        onChange={setNewSocialUrl}
                        onRemove={() => {
                          setNewSocialUrl("");
                        }}
                      />
                    )}
                    <Button
                      type="button"
                      variant="accent"
                      className="w-full rounded-2xl"
                      disabled={!newSocialPlatform || !newSocialUrl.trim()}
                      onClick={addSocialLink}
                    >
                      {t("onboarding.socialAddButton")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("onboarding.contentCategory")}</Label>
                  <Select
                    value={watch("category")}
                    onValueChange={(v) => {
                      setValue("category", v);
                      if (v !== "other") setValue("custom_category", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`category.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {watch("category") === "other" && (
                    <Input
                      className="mt-2"
                      placeholder={t("category.customPlaceholder")}
                      value={watch("custom_category") ?? ""}
                      onChange={(e) => setValue("custom_category", e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("onboarding.country")}</Label>
                  <Select value={watch("city")} onValueChange={(v) => setValue("city", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("onboarding.audienceSize")}</Label>
                  <Select
                    value={watch("follower_range")}
                    onValueChange={(v) => setValue("follower_range", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("onboarding.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLLOWER_RANGES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="contact">{t("onboarding.contactPerson")}</Label>
                <Input id="contact" {...register("contact_person")} />
                {errors.contact_person && (
                  <p className="text-xs text-destructive">
                    {errors.contact_person.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">{t("onboarding.website")}</Label>
                <Input
                  id="website"
                  placeholder={t("onboarding.websitePlaceholder")}
                  {...register("website")}
                />
                {errors.website && (
                  <p className="text-xs text-destructive">{errors.website.message as string}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry">{t("onboarding.industry")}</Label>
                <Input
                  id="industry"
                  placeholder={t("onboarding.industryPlaceholder")}
                  {...register("industry")}
                />
              </div>
            </>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("onboarding.saving") : t("onboarding.completeProfile")}
          </Button>
        </form>
      </div>
    </div>
  );
}
