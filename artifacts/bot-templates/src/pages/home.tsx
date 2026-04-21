import { Link } from "wouter";
import { Bot, MessageSquare, ArrowRight, Code, Terminal, Zap, Server, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { useLanguage } from "@/context/language";

export default function Home() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {t("homeTitle")}
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-3xl">
            {t("homeSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Bot className="h-5 w-5 flex-shrink-0" />
                {t("homeTelegramTitle")}
              </CardTitle>
              <CardDescription className="text-sm">{t("homeTelegramDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground mb-2">
                <li className="flex items-center gap-2"><Code className="h-3.5 w-3.5 flex-shrink-0" />{t("homeFeature1")}</li>
                <li className="flex items-center gap-2"><Code className="h-3.5 w-3.5 flex-shrink-0" />{t("homeFeature2")}</li>
                <li className="flex items-center gap-2"><Code className="h-3.5 w-3.5 flex-shrink-0" />{t("homeFeature3")}</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/telegram" className="w-full">
                <Button className="w-full group text-sm" data-testid="link-home-telegram">
                  {t("homeViewTelegram")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="h-5 w-5 flex-shrink-0" />
                {t("homeWhatsAppTitle")}
              </CardTitle>
              <CardDescription className="text-sm">{t("homeWhatsAppDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground mb-2">
                <li className="flex items-center gap-2"><Code className="h-3.5 w-3.5 flex-shrink-0" />{t("homeWaFeature1")}</li>
                <li className="flex items-center gap-2"><Code className="h-3.5 w-3.5 flex-shrink-0" />{t("homeWaFeature2")}</li>
                <li className="flex items-center gap-2"><Code className="h-3.5 w-3.5 flex-shrink-0" />{t("homeWaFeature3")}</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/whatsapp" className="w-full">
                <Button className="w-full group text-sm" data-testid="link-home-whatsapp">
                  {t("homeViewWhatsApp")}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="hover:border-primary transition-colors border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Server className="h-4 w-4" /> {t("navDeploy")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("deploySubtitle")}
            </CardContent>
            <CardFooter>
              <Link href="/deploy" className="w-full">
                <Button variant="outline" className="w-full text-sm" data-testid="link-home-deploy">
                  {t("navDeploy")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          <Card className="hover:border-primary transition-colors border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Key className="h-4 w-4" /> {t("navCredentials")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("credSubtitle")}
            </CardContent>
            <CardFooter>
              <Link href="/credentials" className="w-full">
                <Button variant="outline" className="w-full text-sm" data-testid="link-home-cred">
                  {t("navCredentials")} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight border-b pb-2">
            {t("homeChecklist")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="flex gap-3">
              <div className="bg-muted p-2.5 rounded-full h-fit flex-shrink-0">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">{t("homeStep1Title")}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("homeStep1Desc")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-muted p-2.5 rounded-full h-fit flex-shrink-0">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">{t("homeStep2Title")}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("homeStep2Desc")}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-muted p-2.5 rounded-full h-fit flex-shrink-0">
                <Code className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-sm">{t("homeStep3Title")}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("homeStep3Desc")}</p>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <Link href="/setup">
              <Button variant="outline" size="sm" data-testid="link-home-setup">
                {t("homeReadSetup")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
