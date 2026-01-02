import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, CheckSquare, ShoppingBag, Calendar, LogOut, Backpack, BookMarked, Sparkles, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Quests", icon: CheckSquare },
    { href: "/schedule", label: "Planner", icon: Calendar },
    { href: "/streaks", label: "Streaks", icon: Flame },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
    { href: "/inventory", label: "Inventory", icon: Backpack },
    { href: "/diary", label: "Diary", icon: BookMarked },
    { href: "/luminous", label: "Luminous", icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 md:relative md:border-t-0 md:w-64 md:h-screen md:flex-shrink-0 md:border-r">
      <div className="flex flex-col h-full md:flex-col md:h-full">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center gap-3 mb-8 px-6 pt-6">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-bold text-white">L</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">LifeRPG</span>
        </div>

        {/* Mobile Scrollable Navigation */}
        <div className="md:hidden h-16 overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <div className="flex gap-1 p-2 min-w-max">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap
                    text-xs font-medium flex-shrink-0
                    ${isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                  data-testid={`nav-link-${item.href}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Desktop Vertical Navigation */}
        <div className="hidden md:flex md:flex-col w-full gap-2 px-2 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200
                  text-sm font-medium
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
                data-testid={`nav-link-${item.href}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Desktop Logout Button */}
        <div className="hidden md:block p-2 border-t border-border/50 mt-auto">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
