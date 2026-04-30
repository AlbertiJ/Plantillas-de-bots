import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/context/language";
import { AuthProvider } from "@/context/auth";
import { BrightnessProvider } from "@/context/brightness";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import TelegramBots from "@/pages/telegram";
import WhatsAppBots from "@/pages/whatsapp";
import SetupGuide from "@/pages/setup";
import Tips from "@/pages/tips";
import Deployment from "@/pages/deployment";
import Credentials from "@/pages/credentials";
import CommonErrors from "@/pages/errors";
import BotBuilder from "@/pages/builder";
import Libraries from "@/pages/libraries";
import CtfOsint from "@/pages/ctf-osint";
import CtfTemplates from "@/pages/ctf-templates";
import Watchdog from "@/pages/watchdog";
import StatusPage from "@/pages/status";
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import ActivityPage from "@/pages/activity";
import LauncherPage from "@/pages/launcher";

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
      <Route path="/builder" component={BotBuilder} />
      <Route path="/libraries" component={Libraries} />
      <Route path="/ctf-osint" component={CtfOsint} />
      <Route path="/ctf-templates" component={CtfTemplates} />
      <Route path="/watchdog" component={Watchdog} />
      <Route path="/status" component={StatusPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin">
        {() => (
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/activity">
        {() => (
          <ProtectedRoute>
            <ActivityPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/launcher">
        {() => (
          <ProtectedRoute>
            <LauncherPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LanguageProvider>
        <BrightnessProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </BrightnessProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
