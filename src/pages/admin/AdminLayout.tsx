import { ReactNode, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  Headphones,
  BookOpen,
  Library,
  Bell,
  ScrollText,
  ArrowLeft,
  Crown,
  Settings as SettingsIcon,
  Megaphone,
  Activity,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/audios", label: "Audios", icon: Headphones },
  { to: "/admin/devotionals", label: "Devotionals", icon: BookOpen },
  { to: "/admin/bible", label: "Bible Content", icon: Library },
  { to: "/admin/engagement", label: "Engagement", icon: Megaphone },
  { to: "/admin/reminders", label: "Reminders", icon: Bell },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { to: "/admin/health", label: "Health", icon: Activity },
  { to: "/admin/errors", label: "Errors", icon: AlertCircle },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon },
  { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

const Loader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export const AdminLayout = ({ children }: { children?: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Redirect /admin → /admin/overview
  useEffect(() => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") {
      navigate("/admin/overview", { replace: true });
    }
  }, [location.pathname, navigate]);

  if (loading) return <Loader />;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="font-display text-2xl text-foreground">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This dashboard is for administrators only.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/40 bg-card/40 backdrop-blur lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border/40 px-5">
          <Crown className="h-5 w-5 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm text-foreground">Solomon Wealth</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Admin Console
            </span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border/40 p-3">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to app
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border/40 bg-card/40 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-display text-sm">Admin</span>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Back to app
          </Link>
        </header>

        {/* Mobile horizontal nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border/40 bg-card/40 px-2 py-2 backdrop-blur lg:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
