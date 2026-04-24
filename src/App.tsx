import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Welcome from "./pages/Welcome.tsx";
import Audio from "./pages/Audio.tsx";
import AudioHistory from "./pages/AudioHistory.tsx";
import Read from "./pages/Read.tsx";
import Tools from "./pages/Tools.tsx";
import Calculator from "./pages/Calculator.tsx";
import Mortgage from "./pages/Mortgage.tsx";
import Budget from "./pages/Budget.tsx";
import EmergencyFund from "./pages/EmergencyFund.tsx";
import NetWorth from "./pages/NetWorth.tsx";
import RuleOf72 from "./pages/RuleOf72.tsx";
import Profile from "./pages/Profile.tsx";
import Streak from "./pages/Streak.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Auth from "./pages/Auth.tsx";
import Admin from "./pages/Admin.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import AdminOverview from "./pages/admin/Overview.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import AdminAudios from "./pages/admin/Audios.tsx";
import AdminDevotionals from "./pages/admin/Devotionals.tsx";
import AdminBibleContent from "./pages/admin/BibleContent.tsx";
import AdminCalculators from "./pages/admin/Calculators.tsx";
import AdminReminders from "./pages/admin/Reminders.tsx";
import AdminAuditLog from "./pages/admin/AuditLog.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { OnlineStatusWatcher } from "./hooks/useOnlineStatus";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OnlineStatusWatcher />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
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
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route path="overview" element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="audios" element={<AdminAudios />} />
                <Route path="devotionals" element={<AdminDevotionals />} />
                <Route path="bible" element={<AdminBibleContent />} />
                <Route path="calculators" element={<AdminCalculators />} />
                <Route path="reminders" element={<AdminReminders />} />
                <Route path="audit" element={<AdminAuditLog />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
