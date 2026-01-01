import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-background p-6 text-center">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-2xl space-y-8"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight">
            Let's make this year your <span className="text-primary italic">glow up</span> year
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-lg mx-auto leading-relaxed">
            Level up your life, track your habits, and achieve greatness one quest at a time.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <Button 
            size="lg" 
            className="h-14 px-10 text-lg font-bold rounded-2xl hover-elevate active-elevate-2 shadow-lg shadow-primary/20"
            onClick={onEnter}
            data-testid="button-enter-app"
          >
            I'm Ready
          </Button>
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 text-sm text-muted-foreground font-medium tracking-widest uppercase"
      >
        LifeRPG v2.0
      </motion.p>
    </div>
  );
}
