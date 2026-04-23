import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bot, MessageSquare, Terminal, Lightbulb, Menu, Moon, Sun, Server, Key, AlertCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/context/language";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!theme) setTheme("dark");
  }, [theme, setTheme]);

  const navItems = [
    { href: "/", label: t("navHome"), icon: Terminal },
    { href: "/telegram", label: t("navTelegram"), icon: Bot },
    { href: "/whatsapp", label: t("navWhatsApp"), icon: MessageSquare },
    { href: "/setup", label: t("navSetup"), icon: Terminal },
    { href: "/tips", label: t("navTips"), icon: Lightbulb },
    { href: "/deploy", label: t("navDeploy"), icon: Server },
    { href: "/credentials", label: t("navCredentials"), icon: Key },
    { href: "/errors", label: t("navErrors"), icon: AlertCircle },
  ];

  const SidebarContent = ({ onNav }: { onNav?: () => void }) => (
    <div className="flex flex-col h-full py-4">
      <div className="px-4 sm:px-6 py-3 flex items-center gap-2 font-bold text-base sm:text-lg mb-2 border-b border-border">
        <Bot className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="truncate">{t("appTitle")}</span>
      </div>

      <nav className="flex-1 px-2 sm:px-4 space-y-0.5 text-sm font-medium overflow-y-auto">
        {navItems.map((item) => {
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
                <span className="truncate">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pt-4 border-t border-border space-y-1 mt-2">
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

      {/* Floating Language Toggle — always visible, right side */}
      <button
        onClick={() => setLang(lang === "es" ? "en" : "es")}
        className="hidden md:flex fixed right-4 bottom-6 z-50 items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-full shadow-lg hover:opacity-90 transition-opacity"
        data-testid="button-lang-float"
        title={lang === "es" ? "Switch to English" : "Cambiar a Español"}
      >
        <span>{lang === "es" ? "🇬🇧 EN" : "🇦🇷 ES"}</span>
      </button>
    </div>
  );
}
