import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, CheckSquare, ShoppingBag, Calendar, LogOut, Backpack } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navigation() {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Quests", icon: CheckSquare },
    { href: "/schedule", label: "Planner", icon: Calendar },
    { href: "/shop", label: "Shop", icon: ShoppingBag },
    { href: "/inventory", label: "Inventory", icon: Backpack },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/50 md:relative md:border-t-0 md:w-64 md:h-screen md:flex-shrink-0 md:border-r">
      <div className="flex flex-row md:flex-col h-16 md:h-full items-center md:items-stretch justify-around md:justify-start md:p-6">
        <div className="hidden md:flex items-center gap-3 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-bold text-white">L</span>
          </div>
          <span className="font-display font-bold text-xl tracking-tight">LifeRPG</span>
        </div>

        <div className="flex flex-row md:flex-col w-full gap-1 md:gap-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200
                  flex-col md:flex-row text-xs md:text-sm font-medium
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className={`w-5 h-5 md:w-4 md:h-4 ${isActive ? "text-primary" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:block mt-auto pt-6 border-t border-border/50">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-3"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
