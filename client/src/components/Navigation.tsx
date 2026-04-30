import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, CheckSquare, ShoppingBag, Calendar,
  LogOut, Backpack, BookMarked, Sparkles, Flame, Activity,
  Timer, Trophy, Shield, Swords, ShoppingCart, Lock,
  Grid3x3, Search, X, Home as HomeIcon, ChevronRight, ShieldOff,
} from "lucide-react";
import { useVaultStatus, useLockVault } from "@/components/VaultGate";

const OWNER_USER_ID = "26147528";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  group: "MAIN" | "TRAINING" | "BODY" | "ECONOMY" | "MIND" | "STATUS";
  ownerOnly?: boolean;
};

const ALL_ITEMS: NavItem[] = [
  // MAIN
  { href: "/",            label: "Dashboard", icon: LayoutDashboard, group: "MAIN" },
  { href: "/tasks",       label: "Quests",    icon: CheckSquare,     group: "MAIN" },
  { href: "/schedule",    label: "Planner",   icon: Calendar,        group: "MAIN" },
  // TRAINING
  { href: "/quest-timer", label: "Quest Timer",    icon: Swords, group: "TRAINING" },
  { href: "/timer",       label: "Pressure Timer", icon: Timer,  group: "TRAINING" },
  { href: "/streaks",     label: "Streaks",        icon: Flame,  group: "TRAINING" },
  // BODY
  { href: "/body-fat",    label: "Body Scan",      icon: Activity, group: "BODY" },
  { href: "/physique",    label: "Physique Vault", icon: Lock,     group: "BODY", ownerOnly: true },
  // ECONOMY
  { href: "/shop",        label: "Shop",      icon: ShoppingBag,  group: "ECONOMY" },
  { href: "/inventory",   label: "Inventory", icon: Backpack,     group: "ECONOMY" },
  { href: "/wishlist",    label: "Wishlist",  icon: ShoppingCart, group: "ECONOMY" },
  // MIND
  { href: "/diary",       label: "Diary",    icon: BookMarked, group: "MIND" },
  { href: "/luminous",    label: "Luminous", icon: Sparkles,   group: "MIND" },
  // STATUS
  { href: "/achievements", label: "Achievements", icon: Trophy, group: "STATUS" },
  { href: "/ranks",        label: "Ranks",        icon: Shield, group: "STATUS" },
];

const GROUP_ORDER: NavItem["group"][] = ["MAIN", "TRAINING", "BODY", "ECONOMY", "MIND", "STATUS"];

// Quick-access items for the mobile dock (always visible)
const DOCK_HREFS = ["/", "/tasks", "/luminous", "/body-fat"];

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: vaultStatus } = useVaultStatus();
  const lockVault = useLockVault();
  const vaultUnlocked = !!vaultStatus?.isSet && !!vaultStatus?.isUnlocked;

  const isOwner = !!user && user.id === OWNER_USER_ID;

  const items = useMemo(
    () => ALL_ITEMS.filter((i) => !i.ownerOnly || isOwner),
    [isOwner]
  );

  const groups = useMemo(() => {
    const map: Record<string, NavItem[]> = {};
    for (const it of items) (map[it.group] ||= []).push(it);
    return GROUP_ORDER.filter((g) => map[g]?.length).map((g) => ({ name: g, items: map[g] }));
  }, [items]);

  const dockItems = items.filter((i) => DOCK_HREFS.includes(i.href));

  // Cmd/Ctrl + K to open palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close palette when navigating
  useEffect(() => { setPaletteOpen(false); }, [location]);

  return (
    <>
      {/* ════════ DESKTOP SIDEBAR ════════ */}
      <nav
        className="hidden md:flex relative z-50 w-64 h-screen flex-shrink-0 flex-col"
        style={{
          background: "rgba(4, 7, 18, 0.97)",
          borderRight: "1px solid rgba(99,102,241,0.18)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="h-px w-full flex-shrink-0"
             style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)" }} />

        {/* Brand */}
        <div className="flex flex-col px-5 pt-6 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0"
                 style={{ border: "1px solid rgba(99,102,241,0.5)", borderRadius: "4px" }}>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
              <span className="font-bold text-base"
                    style={{ fontFamily: "var(--font-mono)", color: "rgba(165,180,252,1)" }}>L</span>
            </div>
            <div>
              <div className="font-bold text-base tracking-widest uppercase"
                   style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}>
                LifeRPG
              </div>
              <div className="hud-label" style={{ fontSize: "0.55rem" }}>◆ Shadow System v2.0</div>
            </div>
          </div>
        </div>

        {/* Quick-open command palette button */}
        <button
          onClick={() => setPaletteOpen(true)}
          data-testid="button-open-palette-desktop"
          className="mx-3 mb-3 px-3 py-2 rounded flex items-center gap-2 transition-all"
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            color: "rgba(148,163,184,0.95)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            letterSpacing: "0.08em",
          }}
        >
          <Search className="w-3 h-3" />
          <span className="uppercase">Jump To...</span>
          <span className="ml-auto px-1.5 py-0.5 rounded text-[0.55rem]"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            ⌘K
          </span>
        </button>

        {/* Categorized vertical nav */}
        <div className="flex flex-col flex-1 overflow-y-auto px-2 pb-2 scrollbar-app">
          {groups.map((g) => (
            <div key={g.name} className="mb-2">
              <div className="flex items-center gap-2 px-3 mt-1 mb-1">
                <div className="hud-label">◈ {g.name}</div>
                <div className="flex-1 h-px" style={{ background: "rgba(99,102,241,0.1)" }} />
              </div>
              <div className="flex flex-col gap-0.5">
                {g.items.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`nav-link-${item.href}`}
                      className="flex items-center gap-3 px-3 py-2 transition-all duration-200 group"
                      style={{
                        borderRadius: "3px",
                        fontFamily: isActive ? "var(--font-mono)" : "var(--font-sans)",
                        fontSize: "0.78rem",
                        letterSpacing: isActive ? "0.06em" : "normal",
                        color: isActive ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.85)",
                        background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                        borderLeft: isActive ? "2px solid rgba(99,102,241,0.85)" : "2px solid transparent",
                        boxShadow: isActive ? "inset 4px 0 16px rgba(99,102,241,0.06)" : "none",
                      }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0"
                            style={{ color: isActive ? "rgba(129,140,248,1)" : "rgba(100,116,139,0.7)" }} />
                      <span className="truncate">{item.label}</span>
                      {item.ownerOnly && (
                        <Lock className="w-2.5 h-2.5 ml-auto opacity-60" />
                      )}
                      {isActive && !item.ownerOnly && (
                        <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Lock Vault button (only when unlocked) */}
        {vaultUnlocked && (
          <div className="flex-shrink-0 px-2 pb-1">
            <button
              onClick={() => lockVault.mutate()}
              data-testid="button-lock-vault"
              disabled={lockVault.isPending}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                letterSpacing: "0.06em",
                color: "rgba(252,211,77,0.85)",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.06)"; }}
            >
              <ShieldOff className="w-4 h-4" />
              SEAL VAULT
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="flex-shrink-0 p-2"
             style={{ borderTop: "1px solid rgba(99,102,241,0.12)" }}>
          <button
            onClick={() => logout()}
            data-testid="button-logout"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.7rem",
              letterSpacing: "0.08em", color: "rgba(100,116,139,0.6)",
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

        <div className="h-px w-full flex-shrink-0"
             style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)" }} />
      </nav>

      {/* ════════ MOBILE BOTTOM DOCK ════════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 py-2"
        style={{
          background: "rgba(4,7,18,0.96)",
          backdropFilter: "blur(18px)",
          borderTop: "1px solid rgba(99,102,241,0.25)",
          boxShadow: "0 -8px 32px rgba(99,102,241,0.08)",
        }}
      >
        <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
          {dockItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`dock-link-${item.href}`}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all flex-1"
                style={{
                  background: isActive ? "rgba(99,102,241,0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                }}
              >
                <Icon className="w-5 h-5"
                      style={{ color: isActive ? "rgba(165,180,252,1)" : "rgba(148,163,184,0.85)" }} />
                <span className="text-[0.55rem] uppercase tracking-wider"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: isActive ? "rgba(199,210,254,1)" : "rgba(100,116,139,0.85)",
                      }}>
                  {item.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          {/* MENU button - opens command palette */}
          <button
            onClick={() => setPaletteOpen(true)}
            data-testid="button-open-palette-mobile"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-all flex-1"
            style={{
              background: paletteOpen ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.4)",
              boxShadow: "0 0 12px rgba(99,102,241,0.15)",
            }}
          >
            <Grid3x3 className="w-5 h-5" style={{ color: "rgba(165,180,252,1)" }} />
            <span className="text-[0.55rem] uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,1)" }}>
              Menu
            </span>
          </button>
        </div>
      </div>

      {/* ════════ COMMAND PALETTE OVERLAY (mobile + desktop ⌘K) ════════ */}
      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            groups={groups}
            currentPath={location}
            onClose={() => setPaletteOpen(false)}
            onLogout={() => logout()}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ════════ COMMAND PALETTE ════════
function CommandPalette({
  groups, currentPath, onClose, onLogout,
}: {
  groups: { name: string; items: NavItem[] }[];
  currentPath: string;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length);
  }, [groups, query]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-3 md:pt-[12vh]"
      style={{ background: "rgba(2,4,11,0.88)", backdropFilter: "blur(14px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -16, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -8, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[78vh] overflow-hidden rounded-lg flex flex-col"
        style={{
          background: "rgba(8,12,24,0.98)",
          border: "1px solid rgba(99,102,241,0.4)",
          boxShadow: "0 0 80px rgba(99,102,241,0.18), 0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Bracket corners */}
        <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: "rgba(99,102,241,0.95)" }} />
        <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: "rgba(99,102,241,0.95)" }} />
        <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: "rgba(99,102,241,0.95)" }} />
        <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: "rgba(99,102,241,0.95)" }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(99,102,241,0.2)" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(165,180,252,0.8)" }} />
          <input
            autoFocus
            type="text"
            placeholder="Search system menu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-palette-search"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{
              fontFamily: "var(--font-mono)",
              color: "rgba(199,210,254,1)",
            }}
          />
          <button onClick={onClose} data-testid="button-close-palette"
            className="p-1 rounded hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" style={{ color: "rgba(148,163,184,0.9)" }} />
          </button>
        </div>

        {/* Grouped grid */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-app">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="hud-label mb-1">◇ NO RESULTS</div>
              <div className="text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
                Nothing matches "{query}"
              </div>
            </div>
          ) : (
            filtered.map((g) => (
              <div key={g.name} className="mb-4">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <div className="hud-label">◈ {g.name}</div>
                  <div className="flex-1 h-px" style={{ background: "rgba(99,102,241,0.12)" }} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {g.items.map((item) => {
                    const isActive = currentPath === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-testid={`palette-link-${item.href}`}
                        className="relative flex flex-col items-center gap-1.5 px-3 py-3 rounded transition-all hover:scale-[1.03]"
                        style={{
                          background: isActive ? "rgba(99,102,241,0.15)" : "rgba(15,23,42,0.55)",
                          border: isActive ? "1px solid rgba(165,180,252,0.7)" : "1px solid rgba(99,102,241,0.18)",
                          boxShadow: isActive ? "0 0 18px rgba(99,102,241,0.25)" : "none",
                        }}
                      >
                        {item.ownerOnly && (
                          <Lock className="w-2.5 h-2.5 absolute top-1.5 right-1.5 opacity-70" style={{ color: "rgba(248,191,91,0.9)" }} />
                        )}
                        <Icon className="w-5 h-5"
                              style={{ color: isActive ? "rgba(165,180,252,1)" : "rgba(148,163,184,0.95)" }} />
                        <span className="text-[0.65rem] uppercase tracking-wider text-center leading-tight"
                              style={{
                                fontFamily: "var(--font-mono)",
                                color: isActive ? "rgba(199,210,254,1)" : "rgba(148,163,184,0.95)",
                              }}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t text-[0.6rem]"
             style={{
               borderColor: "rgba(99,102,241,0.2)",
               background: "rgba(4,7,18,0.6)",
               fontFamily: "var(--font-mono)",
               color: "rgba(100,116,139,0.85)",
             }}>
          <div className="flex items-center gap-3">
            <span>↵ OPEN</span>
            <span>ESC CLOSE</span>
            <span className="hidden sm:inline">⌘K TOGGLE</span>
          </div>
          <button
            onClick={onLogout}
            data-testid="button-palette-logout"
            className="flex items-center gap-1.5 px-2 py-1 rounded uppercase tracking-widest transition-colors"
            style={{ color: "rgba(248,113,113,0.85)" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
