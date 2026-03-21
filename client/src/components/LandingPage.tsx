import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 8,
  duration: Math.random() * 6 + 6,
  opacity: Math.random() * 0.6 + 0.2,
}));

const SYSTEM_LINES = [
  "Initializing consciousness scan...",
  "Analyzing potential: LIMITLESS",
  "Loading shadow realm protocols...",
  "Synchronizing life system...",
];

function Particle({ x, size, delay, duration, opacity }: (typeof PARTICLES)[0]) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        bottom: "-10px",
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(99,102,241,${opacity}), rgba(59,130,246,${opacity * 0.5}))`,
        filter: "blur(0.5px)",
      }}
      animate={{
        y: [0, -1200],
        opacity: [0, opacity, opacity, 0],
        x: [0, (Math.random() - 0.5) * 80],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

function SystemText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(() => onDone?.(), 400);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [text]);
  return (
    <span>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle"
      />
    </span>
  );
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<"boot" | "system" | "reveal" | "ready">("boot");
  const [systemLine, setSystemLine] = useState(0);
  const [showGate, setShowGate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("system");
      setShowGate(true);
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const handleLineDone = () => {
    if (systemLine < SYSTEM_LINES.length - 1) {
      setSystemLine((l) => l + 1);
    } else {
      setTimeout(() => setPhase("reveal"), 300);
      setTimeout(() => setPhase("ready"), 900);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: "radial-gradient(ellipse at 50% 60%, #07091a 0%, #020408 100%)" }}
    >
      {/* ── Particles ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLES.map((p) => (
          <Particle key={p.id} {...p} />
        ))}
      </div>

      {/* ── Dungeon Gate (background portal) ── */}
      <AnimatePresence>
        {showGate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {/* Outer gate ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute w-[700px] h-[700px] rounded-full"
              style={{
                background: "transparent",
                border: "1px solid rgba(99,102,241,0.08)",
                boxShadow: "0 0 80px 20px rgba(99,102,241,0.05), inset 0 0 80px 20px rgba(99,102,241,0.03)",
              }}
            />
            {/* Middle ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute w-[500px] h-[500px] rounded-full"
              style={{
                border: "1px solid rgba(59,130,246,0.12)",
                boxShadow: "0 0 60px 15px rgba(59,130,246,0.06)",
              }}
            />
            {/* Inner glow core */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[300px] h-[300px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)",
                boxShadow: "0 0 120px 40px rgba(99,102,241,0.12)",
              }}
            />
            {/* Center orb */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[120px] h-[120px] rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(147,112,219,0.5) 0%, rgba(99,102,241,0.3) 50%, transparent 70%)",
                boxShadow: "0 0 60px 20px rgba(99,102,241,0.25), 0 0 20px 5px rgba(147,112,219,0.4)",
              }}
            />
            {/* Scanning lines */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-px"
                style={{
                  width: "600px",
                  background: `linear-gradient(90deg, transparent, rgba(99,102,241,${0.04 + i * 0.01}), transparent)`,
                  top: `${20 + i * 12}%`,
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
                animate={{ opacity: [0.2, 0.8, 0.2], scaleX: [0.8, 1.1, 0.8] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── System boot log ── */}
      <AnimatePresence>
        {phase === "system" && (
          <motion.div
            key="syslog"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute top-8 left-8 md:top-12 md:left-12 font-mono text-xs md:text-sm space-y-1"
            style={{ color: "rgba(99,102,241,0.75)" }}
          >
            <div className="text-[10px] md:text-xs mb-3 tracking-[0.3em] uppercase" style={{ color: "rgba(99,102,241,0.45)" }}>
              ▸ SYSTEM BOOT
            </div>
            {SYSTEM_LINES.slice(0, systemLine).map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <span style={{ color: "rgba(99,102,241,0.4)" }}>›</span>
                <span style={{ color: "rgba(147,197,253,0.6)" }}>{line}</span>
                <span className="text-green-400/60">✓</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span style={{ color: "rgba(99,102,241,0.4)" }}>›</span>
              <SystemText text={SYSTEM_LINES[systemLine]} onDone={handleLineDone} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl">

        {/* SYSTEM label */}
        <AnimatePresence>
          {phase !== "boot" && (
            <motion.div
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, letterSpacing: "0.4em" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-6 text-xs md:text-sm font-mono tracking-[0.4em] uppercase"
              style={{ color: "rgba(99,102,241,0.6)" }}
            >
              ◆ SYSTEM MESSAGE ◆
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main headline */}
        <AnimatePresence>
          {phase === "reveal" || phase === "ready" ? (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2 mb-4"
            >
              <h1
                className="text-5xl md:text-8xl font-black tracking-tight leading-none"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: "linear-gradient(135deg, #e2e8f0 0%, #c7d2fe 30%, #818cf8 60%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                  filter: "drop-shadow(0 0 40px rgba(99,102,241,0.4))",
                }}
              >
                ARISE.
              </h1>
              <h2
                className="text-lg md:text-3xl font-bold tracking-wide"
                style={{
                  background: "linear-gradient(90deg, rgba(148,163,184,0.9), rgba(165,180,252,0.9))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Make This Year Your <span style={{ WebkitTextFillColor: "#818cf8" }}>Glow Up</span> Year
              </h2>
            </motion.div>
          ) : (
            <div className="h-32 md:h-48" />
          )}
        </AnimatePresence>

        {/* Sung Jin Woo quote */}
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mb-3"
            >
              <p
                className="text-sm md:text-base leading-relaxed max-w-lg"
                style={{ color: "rgba(148,163,184,0.75)" }}
              >
                I've come too far to only come this far.
              </p>
              <p
                className="text-xs md:text-sm mt-1 font-mono tracking-wider"
                style={{ color: "rgba(99,102,241,0.5)" }}
              >
                — Sung Jin Woo, Shadow Monarch
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status window */}
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-10 px-6 py-4 rounded-xl text-left w-full max-w-sm"
              style={{
                background: "rgba(10,12,28,0.8)",
                border: "1px solid rgba(99,102,241,0.2)",
                boxShadow: "0 0 30px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              <div className="text-[10px] font-mono tracking-[0.25em] uppercase mb-3" style={{ color: "rgba(99,102,241,0.5)" }}>
                ◈ STATUS WINDOW
              </div>
              {[
                { label: "Player", value: "Rushik Sama" },
                { label: "Rank", value: "E → ?" },
                { label: "Title", value: "The One Who Levels Up" },
                { label: "System", value: "LifeRPG v2.0  ✓ Ready" },
              ].map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex justify-between items-center py-1 border-b"
                  style={{ borderColor: "rgba(99,102,241,0.08)" }}
                >
                  <span className="text-xs font-mono" style={{ color: "rgba(99,102,241,0.5)" }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: label === "System" ? "rgba(74,222,128,0.9)" : "rgba(199,210,254,0.9)" }}>
                    {value}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <motion.button
                onClick={onEnter}
                whileHover={{ scale: 1.04, boxShadow: "0 0 50px rgba(99,102,241,0.5), 0 0 100px rgba(99,102,241,0.2)" }}
                whileTap={{ scale: 0.97 }}
                data-testid="button-enter-app"
                className="relative px-12 py-4 text-base md:text-lg font-bold tracking-widest uppercase overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.9) 0%, rgba(79,70,229,0.9) 100%)",
                  border: "1px solid rgba(129,140,248,0.5)",
                  borderRadius: "4px",
                  color: "white",
                  boxShadow: "0 0 30px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: "0.2em",
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5, ease: "linear" }}
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                    width: "60%",
                  }}
                />
                ▸ &nbsp;I AM READY
              </motion.button>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                className="mt-4 text-[10px] font-mono tracking-widest uppercase"
                style={{ color: "rgba(99,102,241,0.35)" }}
              >
                The System awaits your answer
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Corner decorations */}
      {[
        "top-4 left-4 border-t border-l",
        "top-4 right-4 border-t border-r",
        "bottom-4 left-4 border-b border-l",
        "bottom-4 right-4 border-b border-r",
      ].map((pos, i) => (
        <div
          key={i}
          className={`absolute w-8 h-8 ${pos} pointer-events-none`}
          style={{ borderColor: "rgba(99,102,241,0.2)" }}
        />
      ))}

      {/* Bottom version tag */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 font-mono text-[10px] tracking-[0.4em] uppercase"
        style={{ color: "rgba(99,102,241,0.3)" }}
      >
        LifeRPG · Shadow System · v2.0
      </motion.div>
    </div>
  );
}
