import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "turarbekmarat896@gmail.com";

type CreatorAppData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  socialPlatform: string;
  profileLink: string;
};

type BrandAppData = {
  companyName: string;
  email: string;
  phone?: string;
  website?: string;
};

export const submitCreatorApplication = createServerFn({ method: "POST" })
  .validator((data: { userId: string; appData: CreatorAppData }) => data)
  .handler(async ({ data }) => {
    const { userId, appData } = data;
    const now = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await supabaseAdmin.from("applications").insert({
      user_id: userId,
      role: "creator",
      full_name: `${appData.firstName} ${appData.lastName}`,
      email: appData.email,
      phone: appData.phone,
      social_link: `${appData.socialPlatform}: ${appData.profileLink}`,
      company_name: "",
      website: "",
      status: "pending",
    });

    await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: "pending",
        first_name: appData.firstName,
        last_name: appData.lastName,
        email: appData.email,
        phone: appData.phone,
        social_platform: appData.socialPlatform,
        social_link: appData.profileLink,
      })
      .eq("id", userId);

    await supabaseAdmin.from("creator_info").upsert(
      {
        user_id: userId,
        instagram_url: appData.socialPlatform === "Instagram" ? appData.profileLink : "",
        tiktok_url: appData.socialPlatform === "TikTok" ? appData.profileLink : "",
        youtube_url: appData.socialPlatform === "YouTube" ? appData.profileLink : "",
        other_social_links:
          appData.socialPlatform &&
          !["Instagram", "TikTok", "YouTube"].includes(appData.socialPlatform)
            ? JSON.parse(
                `[{"platform":"${appData.socialPlatform}","url":"${appData.profileLink}"}]`,
              )
            : "[]",
        bio: "",
        creator_status: "active",
        profile_completion_pct: 0,
      },
      { onConflict: "user_id" },
    );

    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    for (const admin of admins ?? []) {
      await supabaseAdmin.from("notifications").insert({
        user_id: admin.user_id,
        type: "new_verification_request",
        title: "Новая заявка на верификацию",
        body: `${appData.firstName} ${appData.lastName} (Creator) подал заявку на верификацию.`,
        link: "/admin",
      });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("[AdminNotify] RESEND_API_KEY not set — skipping email");
      return { success: true, emailed: false };
    }

    const resend = new Resend(resendKey);

    const html = `
      <h2>New Creator Application</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        ${row("Full Name", `${appData.firstName} ${appData.lastName}`)}
        ${row("Email", appData.email)}
        ${row("Phone", appData.phone)}
        ${row("Social Platform", appData.socialPlatform)}
        ${row("Profile URL", appData.profileLink)}
        ${row("Registration Date", now)}
      </table>
      <p style="margin-top:20px;color:#888;font-size:12px;">Collabrandly · Admin Notification</p>
    `;

    const { error } = await resend.emails.send({
      from: "Collabrandly <notifications@axenuurexe.resend.app>",
      to: ADMIN_EMAIL,
      subject: "New Creator Application",
      html,
    });

    if (error) {
      console.error("[AdminNotify] Resend error:", error);
      return { success: true, emailed: false, error: error.message };
    }

    return { success: true, emailed: true };
  });

export const submitBrandApplication = createServerFn({ method: "POST" })
  .validator((data: { userId: string; appData: BrandAppData }) => data)
  .handler(async ({ data }) => {
    const { userId, appData } = data;
    const now = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await supabaseAdmin.from("applications").insert({
      user_id: userId,
      role: "brand",
      full_name: appData.companyName,
      email: appData.email,
      phone: appData.phone,
      social_link: "",
      company_name: appData.companyName,
      website: appData.website,
      status: "pending",
    });

    await supabaseAdmin
      .from("profiles")
      .update({
        verification_status: "pending",
        email: appData.email,
        phone: appData.phone,
        website: appData.website,
      })
      .eq("id", userId);

    await supabaseAdmin.from("brand_info").upsert(
      {
        user_id: userId,
        company_name: appData.companyName,
        business_email: appData.email,
        phone: appData.phone,
        website: appData.website,
        verification_status: "pending",
      },
      { onConflict: "user_id" },
    );

    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    for (const admin of admins ?? []) {
      await supabaseAdmin.from("notifications").insert({
        user_id: admin.user_id,
        type: "new_verification_request",
        title: "Новая заявка на верификацию",
        body: `${appData.companyName} (Brand) подал заявку на верификацию.`,
        link: "/admin",
      });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn("[AdminNotify] RESEND_API_KEY not set — skipping email");
      return { success: true, emailed: false };
    }

    const resend = new Resend(resendKey);

    const html = `
      <h2>New Brand Application</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        ${row("Company Name", appData.companyName)}
        ${row("Business Email", appData.email)}
        ${row("Phone", appData.phone)}
        ${row("Website", appData.website)}
        ${row("Registration Date", now)}
      </table>
      <p style="margin-top:20px;color:#888;font-size:12px;">Collabrandly · Admin Notification</p>
    `;

    const { error } = await resend.emails.send({
      from: "Collabrandly <notifications@axenuurexe.resend.app>",
      to: ADMIN_EMAIL,
      subject: "New Brand Application",
      html,
    });

    if (error) {
      console.error("[AdminNotify] Resend error:", error);
      return { success: true, emailed: false, error: error.message };
    }

    return { success: true, emailed: true };
  });

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#333;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;">${value}</td></tr>`;
}
