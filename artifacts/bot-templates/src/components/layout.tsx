import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bot, MessageSquare, Terminal, Lightbulb, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Home", icon: Terminal },
  { href: "/telegram", label: "Telegram Bots", icon: Bot },
  { href: "/whatsapp", label: "WhatsApp Bots", icon: MessageSquare },
  { href: "/setup", label: "Setup Guide", icon: Terminal },
  { href: "/tips", label: "Best Practices", icon: Lightbulb },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  // Force dark mode default for developer vibe
  useEffect(() => {
    if (!theme) {
      setTheme("dark");
    }
  }, [theme, setTheme]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full py-4">
      <div className="px-6 py-4 flex items-center gap-2 font-bold text-lg mb-4">
        <Bot className="h-6 w-6 text-primary" />
        <span>Bot Templates</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 text-sm font-medium">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-testid="button-toggle-theme"
        >
          {theme === "dark" ? (
            <><Sun className="h-4 w-4 mr-2" /> Light Mode</>
          ) : (
            <><Moon className="h-4 w-4 mr-2" /> Dark Mode</>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 font-bold">
          <Bot className="h-5 w-5" />
          <span>Bot Templates</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 md:p-8 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
