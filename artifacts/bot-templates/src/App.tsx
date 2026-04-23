import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/context/language";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TelegramBots from "@/pages/telegram";
import WhatsAppBots from "@/pages/whatsapp";
import SetupGuide from "@/pages/setup";
import Tips from "@/pages/tips";
import Deployment from "@/pages/deployment";
import Credentials from "@/pages/credentials";
import CommonErrors from "@/pages/errors";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/telegram" component={TelegramBots} />
      <Route path="/whatsapp" component={WhatsAppBots} />
      <Route path="/setup" component={SetupGuide} />
      <Route path="/tips" component={Tips} />
      <Route path="/deploy" component={Deployment} />
      <Route path="/credentials" component={Credentials} />
      <Route path="/errors" component={CommonErrors} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
