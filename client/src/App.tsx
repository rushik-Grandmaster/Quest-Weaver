import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";
import { VaultGate } from "@/components/VaultGate";
import { WelcomeAnimation } from "@/components/WelcomeAnimation";
import { LandingPage } from "@/components/LandingPage";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pageVariants, pageTransition } from "@/lib/animations";

import Home from "@/pages/Home";
import Tasks from "@/pages/Tasks";
import Shop from "@/pages/Shop";
import Inventory from "@/pages/Inventory";
import UsedItems from "@/pages/UsedItems";
import Schedule from "@/pages/Schedule";
import Diary from "@/pages/Diary";
import Luminous from "@/pages/Luminous";
import LuminousLens from "@/pages/LuminousLens";
import LuminousVoice from "@/pages/LuminousVoice";
import Streaks from "@/pages/Streaks";
import CountdownTimer from "@/pages/CountdownTimer";
import QuestTimer from "@/pages/QuestTimer";
import Wishlist from "@/pages/Wishlist";
import Achievements from "@/pages/Achievements";
import BodyFatAnalysis from "@/pages/BodyFatAnalysis";
import Ranks from "@/pages/Ranks";
import Physique from "@/pages/Physique";
import ScreenTime from "@/pages/ScreenTime";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground overflow-hidden">
      <Navigation />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 scrollbar-app">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{ minHeight: "100%" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Ambient glow + dot grid */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)" }} />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.8) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
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
        <Route path="/diary">
          <VaultGate sectionLabel="Diary"><Diary /></VaultGate>
        </Route>
        <Route path="/luminous" component={Luminous} />
        <Route path="/lens" component={LuminousLens} />
        <Route path="/luminous/voice" component={LuminousVoice} />
        <Route path="/streaks" component={Streaks} />
        <Route path="/body-fat" component={BodyFatAnalysis} />
        <Route path="/timer" component={CountdownTimer} />
        <Route path="/quest-timer" component={QuestTimer} />
        <Route path="/wishlist" component={Wishlist} />
        <Route path="/screen-time" component={ScreenTime} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/ranks" component={Ranks} />
        <Route path="/physique">
          <VaultGate sectionLabel="Physique Vault"><Physique /></VaultGate>
        </Route>
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
