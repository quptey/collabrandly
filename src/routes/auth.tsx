import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT, t } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, signUpSchema, creatorAppSchema, brandAppSchema } from "@/lib/validation";
import { SOCIAL_PLATFORMS } from "@/lib/constants";
import { submitCreatorApplication, submitBrandApplication } from "@/lib/admin-notify.server";
import type { User } from "@supabase/supabase-js";

const searchSchema = z.object({
  mode: fallback(z.enum(["signin", "signup"]), "signin").default("signin"),
  role: fallback(z.enum(["shopper", "creator", "brand"]), "shopper").default("shopper"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: t("auth.metaTitle") }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useT();
  const { mode, role } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isCreatorApp = mode === "signup" && role === "creator";
  const isBrandApp = mode === "signup" && role === "brand";
  const isShopper = mode === "signup" && role === "shopper";

  let schema: z.ZodSchema<any>;
  if (isCreatorApp) schema = creatorAppSchema;
  else if (isBrandApp) schema = brandAppSchema;
  else if (mode === "signup") schema = signUpSchema;
  else schema = signInSchema;

  const form = useForm({ resolver: zodResolver(schema) });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = form;

  async function getAndRedirect(user: User) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const r = prof?.role;
    if (r === "brand") navigate({ to: "/brand" });
    else if (r === "admin") navigate({ to: "/admin" });
    else navigate({ to: "/dashboard" });
  }

  useEffect(() => {
    if (user) {
      getAndRedirect(user);
    }
  }, [user, navigate]);

  const [brandRegistered, setBrandRegistered] = useState(false);

  async function submit(data: any) {
    try {
      if (mode === "signup") {
        const signupData: any = { email: data.email };

        if (isShopper) {
          signupData.password = data.password;
          signupData.options = {
            emailRedirectTo: window.location.origin,
            data: { display_name: data.name, role: "shopper" },
          };
        } else if (isCreatorApp) {
          signupData.password = data.password;
          signupData.options = {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: `${data.firstName} ${data.lastName}`,
              phone: data.phone,
              social_platform: data.socialPlatform,
              social_link: data.profileLink,
              role: "creator",
            },
          };
        } else if (isBrandApp) {
          signupData.password = data.password;
          signupData.options = {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: data.companyName,
              role: "brand",
            },
          };
        }

        const { data: signupResult, error } = await supabase.auth.signUp(signupData);
        if (error) return toast.error(error.message);
        toast.success(t("auth.welcomeAboard"));

        if (isCreatorApp && signupResult?.user) {
          try {
            await submitCreatorApplication({
              data: {
                userId: signupResult.user.id,
                appData: {
                  firstName: data.firstName,
                  lastName: data.lastName,
                  email: data.email,
                  phone: data.phone,
                  socialPlatform: data.socialPlatform,
                  profileLink: data.profileLink,
                },
              },
            });
          } catch (e) {
            console.error("Creator application submission failed:", e);
          }
        }

        if (isBrandApp && signupResult?.user) {
          try {
            await submitBrandApplication({
              data: {
                userId: signupResult.user.id,
                appData: {
                  companyName: data.companyName,
                  email: data.email,
                  phone: "",
                  website: "",
                },
              },
            });
          } catch (e) {
            console.error("Brand application submission failed:", e);
          }
          setBrandRegistered(true);
          return;
        }

        navigate({ to: "/dashboard" });
      } else {
        console.log("Signing in with:", data.email);
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) {
          console.error("Sign in error:", error);
          return toast.error(error.message);
        }
        if (signInData?.user) {
          console.log("Sign in success, redirecting user:", signInData.user.id);
          await getAndRedirect(signInData.user);
        } else {
          console.log("Sign in returned no user, navigating to dashboard");
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      console.error("Unexpected error during submit:", err);
      toast.error(err instanceof Error ? err.message : t("auth.unexpectedError"));
    }
  }

  const isAppForm = isCreatorApp || isBrandApp;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-12 text-background lg:flex">
        <div className="absolute inset-0 -z-0 bg-gradient-to-br from-foreground via-foreground to-accent/30" />
        <Link to="/" className="relative font-display text-xl font-semibold">
          creator·kz
        </Link>
        <div className="relative space-y-5">
          {isCreatorApp ? (
            <>
              <p className="font-display text-4xl font-medium leading-tight text-balance">
                {t("auth.applyTitle")}
              </p>
              <p className="text-sm text-background/60">{t("auth.applySubtitle")}</p>
            </>
          ) : isBrandApp ? (
            <>
              <p className="font-display text-4xl font-medium leading-tight">
                {t("auth.brandApplyTitle")}
              </p>
              <p className="text-sm text-background/60">{t("auth.brandApplySubtitle")}</p>
            </>
          ) : (
            <>
              <p className="font-display text-4xl font-medium leading-tight">"{t("auth.quote")}"</p>
              <p className="text-sm text-background/60">{t("auth.quoteAuthor")}</p>
            </>
          )}
        </div>
        <div className="relative text-sm text-background/50">{t("auth.footerTagline")}</div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-12">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              {isAppForm ? "← " + t("auth.backToHome") : "← " + t("auth.back")}
            </Link>
            <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
              {mode === "signup" ? t("auth.signUpTitle") : t("auth.signInTitle")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {mode === "signup" ? t("auth.signUpSubtitle") : t("auth.signInSubtitle")}
            </p>
          </div>

          {mode === "signup" && !isAppForm && (
            <div className="flex rounded-full border border-border bg-secondary/40 p-1 overflow-x-auto">
              {(["shopper", "creator", "brand"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => navigate({ to: "/auth", search: { mode: "signup", role: r } })}
                  className={`flex-1 whitespace-nowrap rounded-full px-2 sm:px-3 py-2 text-[11px] sm:text-sm font-medium transition-colors ${role === r ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  {r === "shopper"
                    ? t("auth.imShopper")
                    : r === "creator"
                      ? t("auth.imCreator")
                      : t("auth.imBrand")}
                </button>
              ))}
            </div>
          )}

          {(isCreatorApp || isBrandApp) && (
            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm">
              <p className="font-medium">{t("auth.pendingNotice")}</p>
            </div>
          )}

          {brandRegistered ? (
            <div className="space-y-6 py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="font-display text-2xl font-semibold">{t("auth.brandSuccessTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("auth.brandSuccessDesc")}</p>
              <div className="rounded-2xl border border-accent/10 bg-accent/5 p-4 text-left text-sm space-y-2">
                <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> {t("auth.brandSuccessBrowse")}</p>
                <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> {t("auth.brandSuccessSave")}</p>
                <p className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" /> {t("auth.brandSuccessProfile")}</p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button className="w-full rounded-2xl h-12 text-base font-semibold" onClick={() => navigate({ to: "/marketplace" })}>
                  {t("auth.brandSuccessBrowseBtn")}
                </Button>
                <Button variant="outline" className="w-full rounded-2xl h-12 text-base" onClick={() => navigate({ to: "/brand", search: { page: "settings" } })}>
                  {t("auth.brandSuccessProfileBtn")}
                </Button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-4 pb-16 sm:pb-0">
            {isCreatorApp ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">{t("auth.firstName")}</Label>
                    <Input id="firstName" {...register("firstName")} />
                    {errors.firstName && (
                      <p className="text-xs text-destructive">
                        {errors.firstName.message as string}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">{t("auth.lastName")}</Label>
                    <Input id="lastName" {...register("lastName")} />
                    {errors.lastName && (
                      <p className="text-xs text-destructive">
                        {errors.lastName.message as string}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <Input id="phone" type="tel" {...register("phone")} />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("auth.socialPlatform")}</Label>
                  <Select
                    value={watch("socialPlatform")}
                    onValueChange={(v) => setValue("socialPlatform", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("auth.selectPlatform")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.socialPlatform && (
                    <p className="text-xs text-destructive">
                      {errors.socialPlatform.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profileLink">{t("auth.profileLink")}</Label>
                  <Input
                    id="profileLink"
                    placeholder={t("auth.socialPlaceholder")}
                    {...register("profileLink")}
                  />
                  {errors.profileLink && (
                    <p className="text-xs text-destructive">
                      {errors.profileLink.message as string}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={watch("terms")}
                    onCheckedChange={(v) => setValue("terms", v === true)}
                  />
                  <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                    {t("auth.terms")}
                  </Label>
                </div>
                {errors.terms && (
                  <p className="text-xs text-destructive">{errors.terms.message as string}</p>
                )}
              </>
            ) : isBrandApp ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">{t("auth.companyName")}</Label>
                  <Input id="companyName" {...register("companyName")} />
                  {errors.companyName && (
                    <p className="text-xs text-destructive">
                      {errors.companyName.message as string}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t("auth.businessEmail")}</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input id="password" type="password" {...register("password")} />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message as string}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message as string}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="terms"
                    checked={watch("terms")}
                    onCheckedChange={(v) => setValue("terms", v === true)}
                  />
                  <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                    {t("auth.terms")}
                  </Label>
                </div>
                {errors.terms && (
                  <p className="text-xs text-destructive">{errors.terms.message as string}</p>
                )}
              </>
            ) : (
              <>
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">{t("auth.displayName")}</Label>
                      <Input id="name" {...register("name")} />
                      {errors.name && (
                        <p className="text-xs text-destructive">{errors.name.message as string}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message as string}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      <Input id="password" type="password" {...register("password")} />
                      {errors.password && (
                        <p className="text-xs text-destructive">
                          {errors.password.message as string}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...register("confirmPassword")}
                      />
                      {errors.confirmPassword && (
                        <p className="text-xs text-destructive">
                          {errors.confirmPassword.message as string}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="terms"
                        checked={watch("terms")}
                        onCheckedChange={(v) => setValue("terms", v === true)}
                      />
                      <Label
                        htmlFor="terms"
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        {t("auth.terms")}
                      </Label>
                    </div>
                    {errors.terms && (
                      <p className="text-xs text-destructive">{errors.terms.message as string}</p>
                    )}
                  </>
                )}
                {mode === "signin" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">{t("auth.email")}</Label>
                      <Input id="email" type="email" {...register("email")} />
                      {errors.email && (
                        <p className="text-xs text-destructive">{errors.email.message as string}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="password">{t("auth.password")}</Label>
                      <Input id="password" type="password" {...register("password")} />
                      {errors.password && (
                        <p className="text-xs text-destructive">
                          {errors.password.message as string}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remember"
                          checked={watch("rememberMe")}
                          onCheckedChange={(v) => setValue("rememberMe", v === true)}
                        />
                        <Label
                          htmlFor="remember"
                          className="text-xs text-muted-foreground cursor-pointer"
                        >
                          {t("auth.rememberMe")}
                        </Label>
                      </div>
                      <Link
                        to="/auth/reset-password"
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
                      >
                        {t("auth.forgotPassword")}
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}
            <Button
              type="submit"
              variant="accent"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting
                ? t("common.loading")
                : isAppForm
                  ? t("auth.continue")
                  : mode === "signup"
                    ? t("auth.createAccount")
                    : t("auth.signIn")}
            </Button>
          </form>
          )}

          {!isAppForm && (
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signup" ? t("auth.alreadyHave") : t("auth.newHere")}{" "}
              <Link
                to="/auth"
                search={{ mode: mode === "signup" ? "signin" : "signup", role }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {mode === "signup" ? t("auth.signInLink") : t("auth.createAccountLink")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
