import { NavLink } from "react-router-dom";
import { Home, BookOpen, Settings2, User } from "lucide-react";

const items = [
  { to: "/", label: "HOME", icon: Home, end: true },
  { to: "/read", label: "READ", icon: BookOpen },
  { to: "/tools", label: "TOOLS", icon: Settings2 },
  { to: "/profile", label: "PROFILE", icon: User },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-md">
        <div className="glass-card mx-3 mb-3 rounded-3xl px-2 py-3">
          <ul className="flex items-center justify-around">
            {items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 rounded-2xl px-4 py-1.5 transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className="h-5 w-5"
                        strokeWidth={isActive ? 2.2 : 1.6}
                        style={
                          isActive
                            ? { filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.7))" }
                            : undefined
                        }
                      />
                      <span className="text-[10px] font-medium tracking-[0.18em]">
                        {label}
                      </span>
                      {isActive && (
                        <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};
