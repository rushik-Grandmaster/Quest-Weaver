import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
import { LandingPage } from "@/components/LandingPage";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import Home from "@/pages/Home";
import Tasks from "@/pages/Tasks";
import Shop from "@/pages/Shop";
import Inventory from "@/pages/Inventory";
import UsedItems from "@/pages/UsedItems";
import Schedule from "@/pages/Schedule";
import Diary from "@/pages/Diary";
import Luminous from "@/pages/Luminous";
import LuminousLens from "@/pages/LuminousLens";
import Streaks from "@/pages/Streaks";
import BodyFatAnalysis from "@/pages/BodyFatAnalysis";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function PrivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground overflow-hidden">
      <Navigation />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {children}
        </main>
      </div>
      
      {/* Background ambient effects */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[100px]" />
      </div>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [hasEntered, setHasEntered] = useState(() => {
    return sessionStorage.getItem("has_entered_app") === "true";
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasEntered) {
    return (
      <LandingPage 
        onEnter={() => {
          setHasEntered(true);
          sessionStorage.setItem("has_entered_app", "true");
        }} 
      />
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <PrivateLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/shop" component={Shop} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/used-items" component={UsedItems} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/diary" component={Diary} />
        <Route path="/luminous" component={Luminous} />
        <Route path="/lens" component={LuminousLens} />
        <Route path="/streaks" component={Streaks} />
        <Route path="/body-fat" component={BodyFatAnalysis} />
        <Route component={NotFound} />
      </Switch>
    </PrivateLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WelcomeAnimation />
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
