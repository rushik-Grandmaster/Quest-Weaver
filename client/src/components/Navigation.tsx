import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard, CheckSquare, ShoppingBag, Calendar,
  LogOut, Backpack, BookMarked, Sparkles, Flame, Activity,
  Timer, Trophy, Shield, Swords, ShoppingCart
} from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/",             label: "Dashboard",     icon: LayoutDashboard },
    { href: "/tasks",        label: "Quests",        icon: CheckSquare },
    { href: "/schedule",     label: "Planner",       icon: Calendar },
    { href: "/streaks",      label: "Streaks",       icon: Flame },
    { href: "/body-fat",     label: "Body Scan",     icon: Activity },
    { href: "/shop",         label: "Shop",          icon: ShoppingBag },
    { href: "/inventory",    label: "Inventory",     icon: Backpack },
    { href: "/diary",        label: "Diary",         icon: BookMarked },
    { href: "/luminous",     label: "Luminous",      icon: Sparkles },
    { href: "/achievements", label: "Achievements",  icon: Trophy },
    { href: "/ranks",        label: "Ranks",         icon: Shield },
    { href: "/timer",        label: "Pressure Timer",icon: Timer },
    { href: "/quest-timer",  label: "Quest Timer",   icon: Swords },
    { href: "/wishlist",     label: "Amazon Wishlist", icon: ShoppingCart },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:relative md:w-64 md:h-screen md:flex-shrink-0 flex flex-col"
      style={{
        background: "rgba(4, 7, 18, 0.97)",
        borderRight: "1px solid rgba(99,102,241,0.18)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Top glow line */}
      <div
        className="hidden md:block h-px w-full flex-shrink-0"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }}
      />

      {/* ── Desktop Brand ── */}
      <div className="hidden md:flex flex-col px-5 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          {/* Logo mark with corner brackets */}
          <div
            className="relative w-9 h-9 flex items-center justify-center flex-shrink-0"
            style={{ border: "1px solid rgba(99,102,241,0.5)", borderRadius: "4px" }}
          >
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
            <span
              className="font-bold text-base"
              style={{ fontFamily: "var(--font-mono)", color: "rgba(165,180,252,1)" }}
            >
              L
            </span>
          </div>
          <div>
            <div
              className="font-bold text-base tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
            >
              LifeRPG
            </div>
            <div className="hud-label" style={{ fontSize: "0.55rem" }}>
              ◆ Shadow System v2.0
            </div>
          </div>
        </div>
      </div>

      {/* Section divider + label */}
      <div className="hidden md:flex items-center gap-3 px-5 mb-2">
        <div className="hud-label">◈ SYSTEM MENU</div>
        <div className="flex-1 h-px" style={{ background: "rgba(99,102,241,0.15)" }} />
      </div>

      {/* ── Mobile scrollable nav ── */}
      <div
        className="md:hidden h-16 overflow-x-auto"
        style={{ borderTop: "1px solid rgba(99,102,241,0.2)" }}
      >
        <div className="flex items-center gap-1 h-full px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-link-${item.href}`}
                className="flex items-center gap-1.5 px-3 h-10 whitespace-nowrap flex-shrink-0 rounded-sm transition-all duration-200"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.05em",
                  color: isActive ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.8)",
                  background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Desktop vertical nav ── */}
      <div className="hidden md:flex md:flex-col flex-1 overflow-y-auto px-2 gap-0.5 pb-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-link-${item.href}`}
              className="flex items-center gap-3 px-3 py-2.5 transition-all duration-200"
              style={{
                borderRadius: "3px",
                fontFamily: isActive ? "var(--font-mono)" : "var(--font-sans)",
                fontSize: "0.8rem",
                letterSpacing: isActive ? "0.06em" : "normal",
                color: isActive ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.8)",
                background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                borderLeft: isActive ? "2px solid rgba(99,102,241,0.8)" : "2px solid transparent",
                boxShadow: isActive ? "inset 4px 0 16px rgba(99,102,241,0.06)" : "none",
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: isActive ? "rgba(129,140,248,1)" : "rgba(100,116,139,0.7)" }}
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto hud-label" style={{ fontSize: "0.5rem", color: "rgba(99,102,241,0.5)" }}>
                  ▶
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Desktop bottom logout ── */}
      <div
        className="hidden md:block flex-shrink-0 p-2"
        style={{ borderTop: "1px solid rgba(99,102,241,0.12)" }}
      >
        <button
          onClick={() => logout()}
          data-testid="button-logout"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            color: "rgba(100,116,139,0.6)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.9)";
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.6)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut className="w-4 h-4" />
          LOGOUT
        </button>
      </div>

      {/* Bottom glow line */}
      <div
        className="hidden md:block h-px w-full flex-shrink-0"
        style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)" }}
      />
    </nav>
  );
}
