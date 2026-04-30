import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bot, MessageSquare, Terminal, Lightbulb, Menu, Moon, Sun, Server, Key, AlertCircle, Wrench, Library, ShieldAlert, RefreshCw, Activity, Settings, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/context/language";
import { FloatingControls } from "@/components/floating-controls";
import { useAuth } from "@/context/auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!theme) setTheme("dark");
  }, [theme, setTheme]);

  const navTemplates = [
    { href: "/", label: t("navHome"), icon: Terminal },
    { href: "/telegram", label: t("navTelegram"), icon: Bot },
    { href: "/whatsapp", label: t("navWhatsApp"), icon: MessageSquare },
  ];

  const navGuides = [
    { href: "/setup", label: t("navSetup"), icon: Terminal },
    { href: "/tips", label: t("navTips"), icon: Lightbulb },
    { href: "/deploy", label: t("navDeploy"), icon: Server },
    { href: "/credentials", label: t("navCredentials"), icon: Key },
    { href: "/errors", label: t("navErrors"), icon: AlertCircle },
  ];

  const navTools = [
    { href: "/builder", label: t("navBuilder"), icon: Wrench },
    { href: "/libraries", label: t("navLibraries"), icon: Library },
    { href: "/ctf-osint", label: t("navCtfOsint"), icon: ShieldAlert },
    { href: "/ctf-templates", label: t("navCtfTemplates"), icon: ShieldAlert },
    { href: "/watchdog", label: t("navWatchdog"), icon: RefreshCw },
    { href: "/status", label: t("navStatus"), icon: Activity },
  ];

  const NavGroup = ({ items, label, onNav }: { items: typeof navTemplates; label: string; onNav?: () => void }) => (
    <div className="mb-1">
      <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
        {label}
      </p>
      {items.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={onNav}>
            <div
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              data-testid={`link-nav-${item.href.replace("/", "") || "home"}`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate text-sm">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 sm:px-6 py-3 flex items-center gap-2 font-bold text-base sm:text-lg mb-2 border-b border-border">
        <Bot className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="truncate">{t("appTitle")}</span>
      </div>

      <nav className="flex-1 px-2 sm:px-4 overflow-y-auto">
        <NavGroup items={navTemplates} label={t("navGroupTemplates")} onNav={onNav} />
        <div className="border-t border-border/40 my-1" />
        <NavGroup items={navGuides} label={t("navGroupGuides")} onNav={onNav} />
        <div className="border-t border-border/40 my-1" />
        <NavGroup items={navTools} label={t("navGroupTools")} onNav={onNav} />
      </nav>

      <div className="px-4 pt-3 border-t border-border space-y-1 mt-2">
        {/* Admin section — only when logged in */}
        {user && (
          <>
            <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground/70">
              <Settings className="h-3 w-3" />
              <span className="truncate font-medium">{user.username}</span>
            </div>
            <Link href="/admin">
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-xs ${
                  location === "/admin"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid="link-nav-admin"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>{t("navAdmin")}</span>
              </div>
            </Link>
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>{t("adminLockHint")}</span>
            </button>
            <div className="border-t border-border/40 my-1" />
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground text-xs"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-testid="button-toggle-theme"
        >
          {theme === "dark" ? (
            <><Sun className="h-3.5 w-3.5 mr-2" />{t("lightMode")}</>
          ) : (
            <><Moon className="h-3.5 w-3.5 mr-2" />{t("darkMode")}</>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-30">
        <div className="flex items-center gap-2 font-bold text-sm">
          <Bot className="h-4 w-4" />
          <span>{t("appTitle")}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs font-bold"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            data-testid="button-lang-mobile"
          >
            {t("langToggle")}
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent onNav={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 lg:w-64 flex-col border-r bg-sidebar flex-shrink-0 sticky top-0 h-screen overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        <div className="mx-auto p-4 sm:p-6 md:p-8 max-w-5xl w-full">
          {children}
        </div>
      </main>

      {/* Floating Controls — brightness + language + theme, bottom right */}
      <FloatingControls />
    </div>
  );
}
