import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT, t } from "@/i18n";
import {
  UserCircle2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Shield,
  MapPin,
  BadgeCheck,
  Clock,
  Ban,
  Pencil,
  X,
  Image,
  Upload,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
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
import { Checkbox } from "@/components/ui/checkbox";
import { PageSkeleton } from "@/components/loading-skeleton";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  CITIES,
  CATEGORIES,
  getCategoryLabel,
  FOLLOWER_RANGES,
  type City,
  type FollowerRange,
} from "@/lib/constants";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: t("profile.metaTitle") }] }),
  component: ProfilePage,
});

const ROLE_LABELS: Record<string, string> = {
  shopper: t("profile.roleShopper"),
  creator: t("profile.roleCreator"),
  brand: t("profile.roleBrand"),
  admin: t("profile.roleAdmin"),
};

function ProfilePage() {
  const { t } = useT();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return "bg-success/10 text-success border border-success/30";
      case "pending":
        return "bg-warning/10 text-warning border border-warning/30";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return <BadgeCheck className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "rejected":
        return <Ban className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-3xl px-6 py-20">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="grid place-items-center px-6 py-32 text-center">
          <p className="text-muted-foreground">{t("profile.notFound")}</p>
        </div>
      </div>
    );
  }

  const vs = profile.verification_status;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t("nav.profile")}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
              {profile.display_name}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? <X className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
            {editing ? t("common.cancel") : t("profile.editProfile")}
          </Button>
        </div>

        {editing ? (
          <ProfileEditorForm
            profile={profile}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["my-profile"] });
              setEditing(false);
            }}
          />
        ) : (
          <div className="space-y-6">
            {profile.cover_url && (
              <div className="aspect-[3/1] overflow-hidden rounded-3xl bg-warm">
                <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-border bg-secondary/20">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <UserCircle2 className="h-14 w-14 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4 text-center sm:text-left">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{profile.display_name}</h2>
                    {profile.username && (
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${profile.role === "brand" ? "bg-[#FEF3C7] text-[#92400E] border border-[#D4A017]" : "bg-secondary"}`}
                      >
                        {ROLE_LABELS[profile.role] || profile.role}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusColor(vs)}`}
                      >
                        {statusIcon(vs)}
                        {vs === "active"
                          ? t("profile.statusActive")
                          : vs === "approved"
                            ? t("profile.statusApproved")
                            : vs === "pending"
                              ? t("profile.statusPending")
                              : vs === "rejected"
                                ? t("profile.statusRejected")
                                : vs || t("profile.statusDraft")}
                      </span>
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>{profile.email || user?.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{profile.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>
                        {profile.country || profile.city
                          ? [profile.city, profile.country].filter(Boolean).join(", ")
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>
                        {t("profile.joined", {
                          date: new Date(profile.created_at).toLocaleDateString(),
                        })}
                      </span>
                    </div>
                    {profile.bio && (
                      <div className="sm:col-span-2">
                        <p className="text-muted-foreground">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(profile.role === "brand" || profile.role === "creator") && (
              <div className="rounded-3xl border border-border bg-card p-8">
                <h3 className="font-display text-lg font-semibold mb-4">
                  {profile.role === "brand" ? t("profile.companyInfo") : t("profile.creatorInfo")}
                </h3>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {profile.role === "brand" && (
                    <>
                      {profile.brand_name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4 shrink-0" /> <span>{profile.brand_name}</span>
                        </div>
                      )}
                      {profile.contact_person && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserCircle2 className="h-4 w-4 shrink-0" />{" "}
                          <span>
                            {t("profile.contactLabel", { person: profile.contact_person })}
                          </span>
                        </div>
                      )}
                      {profile.bio && (
                        <div className="sm:col-span-2">
                          <p className="text-muted-foreground text-sm">{profile.bio}</p>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4 shrink-0" /> <span>{profile.website}</span>
                        </div>
                      )}
                      {profile.industry && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Shield className="h-4 w-4 shrink-0" />{" "}
                          <span>{t("profile.industryLabel", { industry: profile.industry })}</span>
                        </div>
                      )}
                    </>
                  )}
                  {profile.role === "creator" && (
                    <>
                      {profile.category && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Shield className="h-4 w-4 shrink-0" />{" "}
                          <span>
                            {t("profile.categoryLabel", {
                              category: getCategoryLabel(
                                t,
                                profile.category,
                                profile.custom_category,
                              ),
                            })}
                          </span>
                        </div>
                      )}
                      {profile.follower_range && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Shield className="h-4 w-4 shrink-0" />{" "}
                          <span>
                            {t("profile.audienceLabel", { range: profile.follower_range })}
                          </span>
                        </div>
                      )}
                      {profile.social_link && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4 shrink-0" /> <span>{profile.social_link}</span>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4 shrink-0" /> <span>{profile.website}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {profile.role === "creator" && vs !== "approved" && vs !== "active" && (
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6 text-center">
                <p className="font-display text-lg font-semibold">
                  {vs === "pending"
                    ? t("profile.underReview")
                    : vs === "rejected"
                      ? t("profile.notApproved")
                      : t("profile.completeProfile")}
                </p>
                {vs === "rejected" && profile.rejection_reason && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("profile.rejectionReasonLabel", { reason: profile.rejection_reason })}
                  </p>
                )}
                {(vs === "draft" || !vs || vs === "rejected") && (
                  <Button
                    variant="accent"
                    className="mt-4"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("profiles")
                        .update({ verification_status: "pending" })
                        .eq("id", profile.id);
                      if (error) return toast.error(error.message);
                      toast.success(t("profile.submittedReview"));
                      qc.invalidateQueries({ queryKey: ["my-profile"] });
                    }}
                  >
                    {t("profile.submitVerification")}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileEditorForm({ profile, onSaved }: { profile: any; onSaved: () => void }) {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  const [cover, setCover] = useState(profile.cover_url ?? "");
  const [name, setName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [country, setCountry] = useState(profile.country ?? "Kazakhstan");
  const [category, setCategory] = useState(profile.category ?? "");
  const [customCategory, setCustomCategory] = useState(profile.custom_category ?? "");
  const [followers, setFollowers] = useState(profile.follower_range ?? "");
  const [socialLink, setSocialLink] = useState(profile.social_link ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [industry, setIndustry] = useState(profile.industry ?? "");
  const [brandName, setBrandName] = useState(profile.brand_name ?? "");
  const [contactPerson, setContactPerson] = useState(profile.contact_person ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: TablesUpdate<"profiles"> = {
      display_name: name,
      username: username || null,
      bio,
      avatar_url: avatar,
      cover_url: cover || null,
      phone,
      city: (city || null) as any,
      country,
      category: (category || null) as any,
      custom_category: category === "other" ? customCategory || null : null,
      follower_range: (followers || null) as any,
      social_link: socialLink,
      website,
      industry,
      brand_name: brandName || null,
      contact_person: contactPerson || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    toast.success(t("dashboard.profileUpdated"));
    onSaved();
  }

  const isCreator = profile.role === "creator";
  const isBrand = profile.role === "brand";

  return (
    <form onSubmit={save} className="space-y-6 rounded-3xl border border-border bg-card p-4 sm:p-8 pb-24 sm:pb-8">
      <h2 className="font-display text-2xl font-semibold">{t("dashboard.editProfile")}</h2>

      <div className="space-y-1.5">
        <Label>{t("profile.coverImage")}</Label>
        <ImageUpload value={cover} onChange={(v) => setCover(v)} folder="covers" />
      </div>

      <div className="space-y-1.5">
        <Label>{t("profile.profilePhoto")}</Label>
        <ImageUpload value={avatar} onChange={(v) => setAvatar(v)} folder="avatars" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pn">{isBrand ? t("profile.companyName") : t("profile.fullName")}</Label>
        <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      {isCreator && (
        <div className="space-y-1.5">
          <Label htmlFor="un">{t("profile.username")}</Label>
          <Input
            id="un"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("profile.usernamePlaceholder")}
          />
        </div>
      )}

      {isCreator && (
        <div className="space-y-1.5">
          <Label htmlFor="pb">{t("profile.bio")}</Label>
          <Textarea id="pb" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pp">{t("auth.phone")}</Label>
        <Input id="pp" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("profile.city")}</Label>
          <Select value={city} onValueChange={(v) => setCity(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("profile.selectCity")} />
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
          <Label htmlFor="pc">{t("profile.country")}</Label>
          <Input
            id="pc"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={t("profile.countryPlaceholder")}
          />
        </div>
      </div>

      {isCreator && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("profile.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v);
                  if (v !== "other") setCustomCategory("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`category.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {category === "other" && (
                <Input
                  className="mt-2"
                  placeholder={t("category.customPlaceholder")}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t("profile.audienceSize")}</Label>
              <Select value={followers} onValueChange={(v) => setFollowers(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.selectPlaceholder")} />
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

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t("profile.socialLink")}</p>
            <div className="space-y-1.5">
              <Label htmlFor="sl">{t("profile.instagramUrl")}</Label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sl"
                  className="pl-9"
                  value={socialLink}
                  onChange={(e) => setSocialLink(e.target.value)}
                  placeholder={t("profile.socialPlaceholder")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">{t("profile.website")}</Label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pw"
                  className="pl-9"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder={t("profile.websitePlaceholder")}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {isBrand && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="pbn">{t("profile.companyName")}</Label>
            <Input id="pbn" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pcp">{t("profile.contactPerson")}</Label>
            <Input
              id="pcp"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pbio">{t("profile.companyDescription")}</Label>
            <Textarea id="pbio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">{t("profile.website")}</Label>
            <Input
              id="pw"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t("profile.websitePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pi">{t("profile.industry")}</Label>
            <Input id="pi" value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
        </>
      )}

      <div className="flex gap-3 max-sm:flex-col max-md:sticky max-md:bottom-0 max-md:bg-card max-md:pt-4 max-md:mt-4 max-md:border-t max-md:border-border">
        <Button type="submit" variant="accent" className="max-sm:w-full" disabled={saving}>
          {saving ? t("common.saving") : t("dashboard.saveChanges")}
        </Button>
        <Button type="button" variant="outline" onClick={onSaved}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
