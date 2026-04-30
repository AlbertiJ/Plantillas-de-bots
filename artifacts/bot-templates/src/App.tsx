import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/context/language";
import { AuthProvider } from "@/context/auth";
import { BrightnessProvider } from "@/context/brightness";
import { FloatingControls } from "@/components/floating-controls";
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
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import LauncherPage from "@/pages/launcher";
import ActivityPage from "@/pages/activity";

const queryClient = new QueryClient();

const protect = (Component: React.ComponentType) => () => (
  <ProtectedRoute><Component /></ProtectedRoute>
);

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={protect(Home)} />
      <Route path="/telegram" component={protect(TelegramBots)} />
      <Route path="/whatsapp" component={protect(WhatsAppBots)} />
      <Route path="/setup" component={protect(SetupGuide)} />
      <Route path="/tips" component={protect(Tips)} />
      <Route path="/deploy" component={protect(Deployment)} />
      <Route path="/credentials" component={protect(Credentials)} />
      <Route path="/errors" component={protect(CommonErrors)} />
      <Route path="/admin" component={protect(AdminPage)} />
      <Route path="/launcher" component={protect(LauncherPage)} />
      <Route path="/activity" component={protect(ActivityPage)} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LanguageProvider>
        <BrightnessProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <FloatingControls />
                <Toaster />
              </TooltipProvider>
            </QueryClientProvider>
          </AuthProvider>
        </BrightnessProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
