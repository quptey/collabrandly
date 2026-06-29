import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, CATEGORY_LABELS, CITIES, FOLLOWER_RANGES, type Category, type City, type FollowerRange } from "@/lib/constants";
import { ImageUpload } from "@/components/image-upload";
import { PageSkeleton } from "@/components/loading-skeleton";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingCreatorSchema, onboardingBrandSchema } from "@/lib/validation";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create your storefront — creator·kz" }] }),
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
      social_link: profile?.social_link ?? "",
      category: (profile?.category as string) ?? "",
      city: (profile?.city as string) ?? "",
      follower_range: (profile?.follower_range as string) ?? "",
      brand_name: profile?.brand_name ?? "",
      contact_person: profile?.contact_person ?? "",
      website: profile?.website ?? "",
      industry: profile?.industry ?? "",
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch } = form;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [user, loading, navigate]);

  if (!profile) return <div className="grid min-h-screen place-items-center"><PageSkeleton /></div>;

  async function save(data: any) {
    const payload: TablesUpdate<"profiles"> = {
      display_name: data.display_name,
      bio: data.bio,
      avatar_url: data.avatar_url,
      social_link: data.social_link,
      onboarded: true,
    };
    if (isCreator) {
      payload.category = data.category || null;
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
    const existing = await supabase.from("applications").select("id").eq("user_id", user!.id).maybeSingle();
    const appPayload = isCreator
      ? { full_name: data.display_name, social_link: data.social_link || "", company_name: "" }
      : { full_name: data.display_name, company_name: data.display_name, social_link: "" };
    if (existing.data) {
      await supabase.from("applications").update({ ...appPayload, status: "pending" }).eq("id", existing.data.id);
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
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("onboarding.title")}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
          {isCreator ? t("onboarding.creatorTitle") : t("onboarding.brandTitle")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {isCreator ? t("onboarding.creatorDesc") : t("onboarding.brandDesc")}
        </p>

        <form onSubmit={handleSubmit(save)} className="mt-10 space-y-6 rounded-3xl border border-border bg-card p-8">
          <div className="space-y-1.5">
            <Label htmlFor="name">{isCreator ? t("onboarding.fullName") : t("onboarding.brandName")}</Label>
            <Input id="name" {...register("display_name")} />
            {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message as string}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">{isCreator ? t("onboarding.bio") : t("onboarding.about")}</Label>
            <Textarea id="bio" rows={3} {...register("bio")} placeholder={isCreator ? t("onboarding.bioPlaceholderCreator") : t("onboarding.bioPlaceholderBrand")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avatar">{t("onboarding.profilePhoto")}</Label>
            <ImageUpload value={watch("avatar_url")} onChange={(v) => setValue("avatar_url", v)} folder="avatars" />
          </div>
          {isCreator ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="social">{t("onboarding.socialLink")}</Label>
                <Input id="social" placeholder={t("onboarding.socialLinkPlaceholder")} {...register("social_link")} />
                {errors.social_link && <p className="text-xs text-destructive">{errors.social_link.message as string}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("onboarding.contentCategory")}</Label>
                  <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
                    <SelectTrigger><SelectValue placeholder={t("onboarding.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("onboarding.country")}</Label>
                  <Select value={watch("city")} onValueChange={(v) => setValue("city", v)}>
                    <SelectTrigger><SelectValue placeholder={t("onboarding.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("onboarding.audienceSize")}</Label>
                  <Select value={watch("follower_range")} onValueChange={(v) => setValue("follower_range", v)}>
                    <SelectTrigger><SelectValue placeholder={t("onboarding.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {FOLLOWER_RANGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                {errors.contact_person && <p className="text-xs text-destructive">{errors.contact_person.message as string}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">{t("onboarding.website")}</Label>
                <Input id="website" placeholder={t("onboarding.websitePlaceholder")} {...register("website")} />
                {errors.website && <p className="text-xs text-destructive">{errors.website.message as string}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry">{t("onboarding.industry")}</Label>
                <Input id="industry" placeholder={t("onboarding.industryPlaceholder")} {...register("industry")} />
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