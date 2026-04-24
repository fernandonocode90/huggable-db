import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OnlineStatusWatcher } from "./hooks/useOnlineStatus";
import { AppSettingsProvider } from "./hooks/useAppSettings";
import { MaintenanceGate } from "./components/MaintenanceGate";
import { GlobalBanner } from "./components/GlobalBanner";

// Eager: small + on critical path
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

// Lazy: heavy pages and rarely-visited screens
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const Audio = lazy(() => import("./pages/Audio.tsx"));
const AudioHistory = lazy(() => import("./pages/AudioHistory.tsx"));
const Read = lazy(() => import("./pages/Read.tsx"));
const Tools = lazy(() => import("./pages/Tools.tsx"));
const Calculator = lazy(() => import("./pages/Calculator.tsx"));
const Mortgage = lazy(() => import("./pages/Mortgage.tsx"));
const Budget = lazy(() => import("./pages/Budget.tsx"));
const EmergencyFund = lazy(() => import("./pages/EmergencyFund.tsx"));
const NetWorth = lazy(() => import("./pages/NetWorth.tsx"));
const RuleOf72 = lazy(() => import("./pages/RuleOf72.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Streak = lazy(() => import("./pages/Streak.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));

// Admin: lazy as a single area — nunca carrega para usuários comuns
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const AdminOverview = lazy(() => import("./pages/admin/Overview.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/Users.tsx"));
const AdminAudios = lazy(() => import("./pages/admin/Audios.tsx"));
const AdminDevotionals = lazy(() => import("./pages/admin/Devotionals.tsx"));
const AdminBibleContent = lazy(() => import("./pages/admin/BibleContent.tsx"));
const AdminReminders = lazy(() => import("./pages/admin/Reminders.tsx"));
const AdminAuditLog = lazy(() => import("./pages/admin/AuditLog.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/Settings.tsx"));
const AdminUserDetail = lazy(() => import("./pages/admin/UserDetail.tsx"));
const AdminEngagement = lazy(() => import("./pages/admin/Engagement.tsx"));
const AdminHealth = lazy(() => import("./pages/admin/Health.tsx"));
const AdminClientErrors = lazy(() => import("./pages/admin/ClientErrors.tsx"));
const AdminModeration = lazy(() => import("./pages/admin/Moderation.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OnlineStatusWatcher />
        <BrowserRouter>
          <AuthProvider>
            <AppSettingsProvider>
              <GlobalBanner />
              <MaintenanceGate>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/audio" element={<ProtectedRoute><Audio /></ProtectedRoute>} />
                    <Route path="/audio/history" element={<ProtectedRoute><AudioHistory /></ProtectedRoute>} />
                    <Route path="/read" element={<ProtectedRoute><Read /></ProtectedRoute>} />
                    <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
                    <Route path="/tools/calculator" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
                    <Route path="/tools/mortgage" element={<ProtectedRoute><Mortgage /></ProtectedRoute>} />
                    <Route path="/tools/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
                    <Route path="/tools/emergency-fund" element={<ProtectedRoute><EmergencyFund /></ProtectedRoute>} />
                    <Route path="/tools/net-worth" element={<ProtectedRoute><NetWorth /></ProtectedRoute>} />
                    <Route path="/tools/rule-of-72" element={<ProtectedRoute><RuleOf72 /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/profile/streak" element={<ProtectedRoute><Streak /></ProtectedRoute>} />
                    <Route path="/profile/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                      <Route index element={<Admin />} />
                      <Route path="overview" element={<AdminOverview />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="users/:userId" element={<AdminUserDetail />} />
                      <Route path="audios" element={<AdminAudios />} />
                      <Route path="devotionals" element={<AdminDevotionals />} />
                      <Route path="bible" element={<AdminBibleContent />} />
                      <Route path="reminders" element={<AdminReminders />} />
                      <Route path="engagement" element={<AdminEngagement />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="health" element={<AdminHealth />} />
                      <Route path="errors" element={<AdminClientErrors />} />
                      <Route path="moderation" element={<AdminModeration />} />
                      <Route path="audit" element={<AdminAuditLog />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </MaintenanceGate>
            </AppSettingsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
