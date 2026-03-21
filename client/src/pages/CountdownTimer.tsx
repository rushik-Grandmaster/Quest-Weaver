import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Timer, Skull, ShieldCheck, Sparkles, Clock, AlertTriangle,
  Play, Square, ToggleLeft, ToggleRight, ExternalLink
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUserStats } from "@/hooks/use-gamification";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

type TimerStatus = "no_timer" | "active" | "expired_reset" | "expired_safe";

type TimerData = {
  id: number;
  startTime: string;
  endTime: string;
  startLevel: number;
  isActive: boolean;
};

function formatTime(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getPercentRemaining(startTime: string, endTime: string) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  return Math.max(0, Math.min(100, 100 - (elapsed / total) * 100));
}

export default function CountdownTimer() {
  const { toast } = useToast();
  const { data: stats } = useUserStats();
  const [, navigate] = useLocation();

  const [timerEnabled, setTimerEnabled] = useState(false);
  const [activeTimer, setActiveTimer] = useState<TimerData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetting, setIsSetting] = useState(false);
  const [lastResetEvent, setLastResetEvent] = useState<TimerStatus | null>(null);

  // Custom duration inputs
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  // Fetch active timer on mount
  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch("/api/timer", { credentials: "include" });
      const data = await res.json();
      if (data && data.isActive) {
        setActiveTimer(data);
        setTimerEnabled(true);
      } else {
        setActiveTimer(null);
        setTimerEnabled(false);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimer();
  }, [fetchTimer]);

  // Countdown tick
  useEffect(() => {
    if (!activeTimer) return;
    const tick = () => {
      const remaining = new Date(activeTimer.endTime).getTime() - Date.now();
      setTimeLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  // Check if timer expired every 10 seconds
  useEffect(() => {
    if (!activeTimer) return;
    const check = async () => {
      if (Date.now() < new Date(activeTimer.endTime).getTime()) return;
      try {
        const res = await apiRequest("POST", "/api/timer/check", {});
        const data = await res.json();
        if (data.status === "expired_reset") {
          setLastResetEvent("expired_reset");
          setActiveTimer(null);
          setTimerEnabled(false);
          queryClient.invalidateQueries({ queryKey: [api.userStats.get.path] });
          toast({
            title: "💀 Progress Lost!",
            description: "You failed to level up in time. All progress has been reset.",
            variant: "destructive",
          });
        } else if (data.status === "expired_safe") {
          setLastResetEvent("expired_safe");
          setActiveTimer(null);
          setTimerEnabled(false);
          toast({
            title: "🛡️ Progress Saved!",
            description: "You leveled up in time! Well done, Rushik Sama.",
          });
        }
      } catch {
        // silent
      }
    };

    const id = setInterval(check, 10000);
    check();
    return () => clearInterval(id);
  }, [activeTimer, toast]);

  const handleSetTimer = async () => {
    const totalMs = ((days * 24 * 60 + hours * 60 + minutes) * 60 * 1000);
    if (totalMs <= 0) {
      toast({ title: "Invalid Duration", description: "Please set at least 1 minute.", variant: "destructive" });
      return;
    }
    setIsSetting(true);
    try {
      const res = await apiRequest("POST", "/api/timer", { durationMs: totalMs });
      const data = await res.json();
      setActiveTimer(data);
      setLastResetEvent(null);
      toast({
        title: "⏳ Timer Started",
        description: `You have until ${new Date(data.endTime).toLocaleString()} to gain a level.`,
      });
    } catch {
      toast({ title: "Error", description: "Failed to start timer.", variant: "destructive" });
    } finally {
      setIsSetting(false);
    }
  };

  const handleCancel = async () => {
    try {
      await fetch("/api/timer", { method: "DELETE", credentials: "include" });
      setActiveTimer(null);
      setTimerEnabled(false);
      toast({ title: "Timer Cancelled", description: "Your progress is safe." });
    } catch {
      toast({ title: "Error", description: "Failed to cancel timer.", variant: "destructive" });
    }
  };

  const { days: dLeft, hours: hLeft, minutes: mLeft, seconds: sLeft } = formatTime(timeLeft);
  const percent = activeTimer ? getPercentRemaining(activeTimer.startTime, activeTimer.endTime) : 0;
  const isUrgent = percent < 20 && activeTimer;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <Timer className="text-primary" /> Pressure Timer
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Set a deadline. Level up before time runs out — or lose everything.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/luminous")}
          className="flex items-center gap-2 border-primary/30 hover:border-primary text-primary"
          data-testid="button-open-luminous"
        >
          <Sparkles className="w-4 h-4" />
          Ask Luminous
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>

      {/* Reset event feedback */}
      <AnimatePresence>
        {lastResetEvent && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-5 rounded-2xl border flex items-start gap-4 ${
              lastResetEvent === "expired_reset"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-green-500/10 border-green-500/30"
            }`}
          >
            {lastResetEvent === "expired_reset" ? (
              <Skull className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`font-bold text-lg ${lastResetEvent === "expired_reset" ? "text-red-500" : "text-green-500"}`}>
                {lastResetEvent === "expired_reset" ? "Progress Reset" : "Progress Saved!"}
              </p>
              <p className="text-sm text-muted-foreground">
                {lastResetEvent === "expired_reset"
                  ? "You failed to level up before the timer expired. All XP, gold, and levels have been reset to zero."
                  : "You leveled up in time, Rushik Sama! The pressure paid off — your progress is safe."}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setLastResetEvent(null)}>✕</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle */}
      <Card className="bg-card/60 border-border/50">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="font-semibold text-base">Enable Pressure Timer</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Optional — activate only when you want high stakes.
            </p>
          </div>
          <button
            onClick={() => {
              if (timerEnabled && activeTimer) {
                handleCancel();
              } else {
                setTimerEnabled(!timerEnabled);
              }
            }}
            className="transition-all"
            data-testid="toggle-timer-enabled"
          >
            {timerEnabled ? (
              <ToggleRight className="w-12 h-12 text-primary" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-muted-foreground" />
            )}
          </button>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {/* Active Timer Display */}
        {activeTimer && timerEnabled && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Big countdown */}
            <Card className={`border overflow-hidden relative ${isUrgent ? "border-red-500/50 bg-red-500/5" : "border-primary/20 bg-card/60"}`}>
              {isUrgent && (
                <motion.div
                  className="absolute inset-0 bg-red-500/5"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="text-center text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                  {isUrgent ? (
                    <><AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" /> Time is running out!</>
                  ) : (
                    <><Clock className="w-4 h-4 text-primary" /> Time remaining</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                {/* Digit display */}
                <div className="flex items-center justify-center gap-2 md:gap-4">
                  {[
                    { value: dLeft, label: "Days" },
                    { value: hLeft, label: "Hours" },
                    { value: mLeft, label: "Min" },
                    { value: sLeft, label: "Sec" },
                  ].map(({ value, label }, i) => (
                    <React.Fragment key={label}>
                      {i > 0 && (
                        <span className={`text-3xl md:text-5xl font-bold mb-4 ${isUrgent ? "text-red-400" : "text-muted-foreground"}`}>:</span>
                      )}
                      <div className="flex flex-col items-center">
                        <motion.div
                          key={value}
                          initial={{ y: -10, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className={`text-4xl md:text-7xl font-bold font-display tabular-nums ${isUrgent ? "text-red-400" : "text-foreground"}`}
                        >
                          {pad(value)}
                        </motion.div>
                        <span className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">{label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-8 px-4">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full transition-all ${isUrgent ? "bg-red-500" : "bg-primary"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Started Lv.{activeTimer.startLevel}</span>
                    <span>{percent.toFixed(0)}% remaining</span>
                    <span>Current Lv.{stats?.level ?? "?"}</span>
                  </div>
                </div>

                {/* Level status */}
                {stats && (
                  <div className="mt-6 mx-4 p-4 rounded-xl bg-muted/30 border border-border/30 flex items-center gap-3">
                    {(stats.level > activeTimer.startLevel) ? (
                      <>
                        <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-green-500 font-semibold text-sm">Level gained!</p>
                          <p className="text-xs text-muted-foreground">You're safe. You leveled up from {activeTimer.startLevel} → {stats.level}.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Skull className={`w-5 h-5 flex-shrink-0 ${isUrgent ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`font-semibold text-sm ${isUrgent ? "text-red-500" : "text-foreground"}`}>
                            {isUrgent ? "Level up NOW!" : "No level gained yet"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            You need to reach Lv.{activeTimer.startLevel + 1} before time runs out.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info + Cancel */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/luminous")}
                className="flex-1 border-primary/30 hover:border-primary text-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Get coaching from Luminous
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 border-red-500/30 hover:border-red-500 text-red-500 hover:text-red-500"
              >
                <Square className="w-4 h-4 mr-2" />
                Cancel Timer
              </Button>
            </div>
          </motion.div>
        )}

        {/* Timer setup form */}
        {timerEnabled && !activeTimer && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="bg-card/60 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  Set Your Deadline
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  You must gain at least <strong>1 level</strong> before this timer ends — or all your XP, gold, and progress will be wiped.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Days</label>
                    <Input
                      type="number"
                      min={0}
                      max={365}
                      value={days}
                      onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="text-center text-xl font-bold h-14"
                      data-testid="input-days"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Hours</label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                      className="text-center text-xl font-bold h-14"
                      data-testid="input-hours"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Minutes</label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="text-center text-xl font-bold h-14"
                      data-testid="input-minutes"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Quick Presets</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "1 Hour", d: 0, h: 1, m: 0 },
                      { label: "4 Hours", d: 0, h: 4, m: 0 },
                      { label: "12 Hours", d: 0, h: 12, m: 0 },
                      { label: "1 Day", d: 1, h: 0, m: 0 },
                      { label: "3 Days", d: 3, h: 0, m: 0 },
                      { label: "1 Week", d: 7, h: 0, m: 0 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => { setDays(preset.d); setHours(preset.h); setMinutes(preset.m); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-muted/80 border border-border/50 hover:border-primary/30 transition-all"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-500">Danger Zone</p>
                    <p className="text-muted-foreground mt-0.5">
                      If the timer expires and you haven't gained a level, your XP, gold, level, and streak will all be reset to zero. This cannot be undone.
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
                  onClick={handleSetTimer}
                  disabled={isSetting || (days === 0 && hours === 0 && minutes === 0)}
                  data-testid="button-start-timer"
                >
                  {isSetting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Starting...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Start Pressure Timer</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Disabled state */}
        {!timerEnabled && !lastResetEvent && (
          <motion.div
            key="disabled"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-card/30 border-dashed border-border/40">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Timer className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Timer is off</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Toggle the switch above to enable the Pressure Timer. Use it when you need real stakes to stay motivated.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {["High stakes motivation", "Custom deadline", "Level-up or lose it all"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
