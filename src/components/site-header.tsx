import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationsBell } from "@/components/notifications-bell";
import { Menu, X } from "lucide-react";

export function SiteHeader() {
  const { user, signOut, isBrand, isAdmin, role } = useAuth();
  const navigate = useNavigate();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = (
    <>
      <Link
        to="/"
        onClick={() => setMenuOpen(false)}
        activeProps={{ className: "text-foreground" }}
        activeOptions={{ exact: true }}
        className="transition-colors hover:text-foreground"
      >
        {t("nav.home")}
      </Link>
      <Link
        to="/marketplace"
        onClick={() => setMenuOpen(false)}
        activeProps={{ className: "text-foreground" }}
        className="transition-colors hover:text-foreground"
      >
        {t("nav.marketplace")}
      </Link>
      <Link
        to="/pricing"
        onClick={() => setMenuOpen(false)}
        activeProps={{ className: "text-foreground" }}
        className="transition-colors hover:text-foreground"
      >
        {t("landing.pricingEyebrow")}
      </Link>
      {user && role && (
        <>
          {isBrand ? (
            <Link
              to="/brand"
              onClick={() => setMenuOpen(false)}
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              {t("nav.brandDashboard")}
            </Link>
          ) : (
            <Link
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              {t("nav.dashboard")}
            </Link>
          )}
          <Link
            to="/profile"
            onClick={() => setMenuOpen(false)}
            activeProps={{ className: "text-foreground" }}
            className="transition-colors hover:text-foreground"
          >
            {t("nav.profile")}
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              activeProps={{ className: "text-foreground" }}
              className="transition-colors hover:text-foreground"
            >
              {t("nav.adminDashboard")}
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img
            src="/logo.png"
            alt={t("siteHeader.logoAlt")}
            className="h-8 w-auto sm:h-9 rounded-full object-cover"
          />
          <span className="font-sans text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Collabrandly
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <NotificationsBell />
          <button
            className="grid h-9 w-9 place-items-center rounded-lg md:hidden hover:bg-secondary"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {user ? (
            <>
              {role && (
                <span
                  className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize tracking-wider md:inline-flex ${role === "brand" ? "bg-[#FEF3C7] text-[#92400E] border border-[#D4A017]" : "bg-secondary text-muted-foreground"}`}
                >
                  {role}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                {t("nav.signOut")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => navigate({ to: "/auth" })}
              >
                {t("nav.signIn")}
              </Button>
              <Button
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
              >
                {t("nav.getStarted")}
              </Button>
            </>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 pb-6 pt-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-muted-foreground">
            {navLinks}
            <hr className="border-border" />
            {user ? (
              <>
                {role && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize tracking-wider w-fit ${role === "brand" ? "bg-[#FEF3C7] text-[#92400E] border border-[#D4A017]" : "bg-secondary text-muted-foreground"}`}
                  >
                    {role}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/" });
                    setMenuOpen(false);
                  }}
                >
                  {t("nav.signOut")}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    navigate({ to: "/auth" });
                    setMenuOpen(false);
                  }}
                >
                  {t("nav.signIn")}
                </Button>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    navigate({ to: "/auth", search: { mode: "signup" } });
                    setMenuOpen(false);
                  }}
                >
                  {t("nav.getStarted")}
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
