import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LevelUpEvent = { level: number; rank: string; prevRank: string };

// Module-level pub/sub so any component can trigger the ceremony
const listeners: ((e: LevelUpEvent) => void)[] = [];

export function emitLevelUp(e: LevelUpEvent) {
  listeners.forEach(fn => fn(e));
}

export function subscribeToLevelUp(fn: (e: LevelUpEvent) => void) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i > -1) listeners.splice(i, 1);
  };
}

const RANK_ORDER = ["E", "D", "C", "B", "A", "S", "SS"];

export function getRank(level: number) {
  if (level >= 75) return "SS";
  if (level >= 50) return "S";
  if (level >= 35) return "A";
  if (level >= 20) return "B";
  if (level >= 10) return "C";
  if (level >= 5)  return "D";
  return "E";
}

export function getPrevRank(level: number) {
  return getRank(level - 1);
}

export function LevelUpCeremony() {
  const [event, setEvent] = useState<LevelUpEvent | null>(null);
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    return subscribeToLevelUp((e) => {
      setEvent(e);
      setPhase("enter");
      const holdTimer = setTimeout(() => setPhase("hold"), 600);
      const exitTimer = setTimeout(() => {
        setPhase("exit");
        setTimeout(() => setEvent(null), 800);
      }, 5000);
      return () => { clearTimeout(holdTimer); clearTimeout(exitTimer); };
    });
  }, []);

  const rankChanged = event && event.rank !== event.prevRank;

  return (
    <AnimatePresence>
      {event && phase !== "exit" && (
        <motion.div
          key="ceremony"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(2, 4, 12, 0.88)", backdropFilter: "blur(8px)" }}
          onClick={() => setPhase("exit")}
        >
          {/* Outer rings */}
          {[380, 280, 190].map((size, i) => (
            <motion.div
              key={size}
              className="absolute rounded-full"
              style={{ width: size, height: size }}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 - i * 0.04 }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="w-full h-full rounded-full"
                style={{ border: `1px solid rgba(99,102,241,${0.7 - i * 0.2})`, boxShadow: `0 0 40px rgba(99,102,241,${0.3 - i * 0.08})` }}
              />
            </motion.div>
          ))}

          {/* Pulsing core glow */}
          <motion.div
            className="absolute w-48 h-48 rounded-full"
            animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }}
          />

          {/* Content */}
          <div className="relative z-10 text-center px-8">
            {/* System label */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="hud-label mb-4"
              style={{ color: "rgba(99,102,241,0.7)", letterSpacing: "0.4em" }}
            >
              ◆ SYSTEM NOTIFICATION ◆
            </motion.div>

            {/* Main title */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3rem, 10vw, 7rem)",
                fontWeight: 900,
                lineHeight: 1,
                background: "linear-gradient(135deg, #ffffff 0%, #c7d2fe 40%, #818cf8 70%, #6366f1 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 40px rgba(99,102,241,0.7))",
                letterSpacing: "-0.02em",
              }}
            >
              LEVEL UP
            </motion.h1>

            {/* Level number */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-3 mb-6"
            >
              <span
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-mono)", color: "rgba(165,180,252,0.9)" }}
              >
                Level {event.level - 1} → <span style={{ color: "rgba(199,210,254,1)" }}>{event.level}</span>
              </span>
            </motion.div>

            {/* Rank-up badge (only shown when rank changes) */}
            {rankChanged && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center gap-4 mb-4"
              >
                <div
                  className="px-5 py-2 text-lg font-bold"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "3px",
                    color: "rgba(148,163,184,0.8)",
                  }}
                >
                  Rank {event.prevRank}
                </div>
                <span style={{ color: "rgba(99,102,241,0.7)", fontSize: "1.2rem" }}>→</span>
                <motion.div
                  animate={{ boxShadow: ["0 0 20px rgba(99,102,241,0.4)", "0 0 50px rgba(99,102,241,0.8)", "0 0 20px rgba(99,102,241,0.4)"] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="px-5 py-2 text-lg font-bold"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "rgba(99,102,241,0.2)",
                    border: "1px solid rgba(129,140,248,0.6)",
                    borderRadius: "3px",
                    color: "rgba(199,210,254,1)",
                  }}
                >
                  Rank {event.rank}
                </motion.div>
              </motion.div>
            )}

            {/* Quote */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "rgba(99,102,241,0.45)", letterSpacing: "0.15em" }}
            >
              {rankChanged ? "A NEW RANK AWAITS. THE SHADOWS GROW STRONGER." : "YOU HAVE GROWN STRONGER, RUSHIK SAMA."}
            </motion.p>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 hud-label"
              style={{ color: "rgba(99,102,241,0.25)" }}
            >
              tap anywhere to dismiss
            </motion.p>
          </div>

          {/* Particle burst */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: `rgba(${i % 2 === 0 ? "99,102,241" : "129,140,248"},0.8)`,
                left: "50%",
                top: "50%",
              }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i / 12) * Math.PI * 2) * (120 + Math.random() * 80),
                y: Math.sin((i / 12) * Math.PI * 2) * (120 + Math.random() * 80),
                scale: [0, 2, 0],
                opacity: [1, 0.8, 0],
              }}
              transition={{ delay: 0.1, duration: 1.2, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
