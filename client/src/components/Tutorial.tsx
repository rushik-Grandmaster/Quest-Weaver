import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Zap } from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────────
interface TutorialStep {
  id: string;
  icon: string;
  title: string;
  desc: string;
  selector?: string;
  tip?: string;
}

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    icon: "◈",
    title: "SYSTEM AWAKENED",
    desc: "Welcome, Hunter. LifeRPG transforms your daily life into an epic journey. Complete real tasks to earn XP and Gold, level up, and unlock rewards. This tutorial will walk you through the system.",
    tip: "You can reopen this tutorial anytime from the navigation.",
  },
  {
    id: "dashboard",
    icon: "⬡",
    title: "COMMAND CENTER",
    desc: "Your Dashboard shows your current level, XP bar, gold balance, active streak, and today's quests — all at a glance. Check it every morning to plan your day.",
    selector: "a[href='/']",
    tip: "Your stats update in real-time as you complete quests.",
  },
  {
    id: "quests",
    icon: "⚔",
    title: "QUEST BOARD",
    desc: "Quests are tasks you set for yourself. Each quest has a difficulty (Easy/Medium/Hard) and earns you XP and Gold on completion. Habits repeat daily; One-time quests disappear once done.",
    selector: "a[href='/tasks']",
    tip: "Hard quests earn 5× more XP than Easy ones.",
  },
  {
    id: "quest-inspect",
    icon: "◎",
    title: "QUEST INSPECT",
    desc: "Hover over any quest card to see a live XP projection — showing exactly how much closer to your next level-up you'll be after completing it. Hit the INSPECT button to pin the panel open.",
    selector: "a[href='/tasks']",
    tip: "The XP bar animates to show your gain before you commit.",
  },
  {
    id: "shop",
    icon: "🪙",
    title: "SHADOW MARKET",
    desc: "The Shop is where you spend your hard-earned Gold on real-life rewards — things you actually enjoy. You define what each reward is. No Gold, no reward. Simple.",
    selector: "a[href='/shop']",
    tip: "Create custom rewards: a movie, a meal, anything that motivates you.",
  },
  {
    id: "shop-inspect",
    icon: "◇",
    title: "ITEM INSPECT",
    desc: "Hover any shop card to see the full breakdown: what the item unlocks, the Gold cost, your current balance, and exactly how much Gold you'll have left after buying it.",
    selector: "a[href='/shop']",
    tip: "Red balance means you can't afford it yet — keep grinding.",
  },
  {
    id: "clearspace",
    icon: "🌬",
    title: "CLEARSPACE GATE",
    desc: "Screen-time rewards (YouTube, Netflix, games) trigger a mandatory 4-second breathing exercise before purchase. This is ClearSpace — a mindfulness check to prevent impulse buys.",
    selector: "a[href='/shop']",
    tip: "You can set any URL + duration when creating a screen-time reward.",
  },
  {
    id: "screen-time",
    icon: "⏱",
    title: "SCREEN TIME",
    desc: "After buying a screen-time reward, a countdown session starts here. The timer shows how long you have left. When it expires — that's your limit. Use System Override only in emergencies.",
    selector: "a[href='/screen-time']",
    tip: "Sessions are enforced by the system — no extensions without override.",
  },
  {
    id: "streaks",
    icon: "🔥",
    title: "STREAK SYSTEM",
    desc: "Login every day to maintain your streak. Longer streaks unlock rank bonuses and keep the System from resetting your daily quest progress.",
    selector: "a[href='/streaks']",
    tip: "Missed a day? The streak resets. Stay consistent.",
  },
  {
    id: "ranks",
    icon: "🛡",
    title: "RANK SYSTEM",
    desc: "As you level up, your rank advances from E → D → C → B → A → S → SS. Each rank reflects your real-world dedication. Your rank is earned — it cannot be bought.",
    selector: "a[href='/ranks']",
    tip: "SS Rank requires Level 90. That's the goal.",
  },
  {
    id: "vault",
    icon: "🔐",
    title: "THE VAULT",
    desc: "Your Diary and Physique records are protected by the Vault — a personal password you set. No one can access your private entries without it. Lock it when stepping away.",
    selector: "a[href='/diary']",
    tip: "Set a vault password in the Diary or Physique section.",
  },
  {
    id: "done",
    icon: "⬆",
    title: "YOU ARE READY",
    desc: "The System has accepted you as a Hunter. Now go — complete quests, earn Gold, level up, and become the strongest. Your journey starts the moment you close this panel.",
    tip: "Pro tip: start with 3 quests today.",
  },
];

// ── Context ───────────────────────────────────────────────────────────────────
interface TutorialContextType {
  isActive: boolean;
  startTutorial: () => void;
  closeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType>({
  isActive: false,
  startTutorial: () => {},
  closeTutorial: () => {},
});

export function useTutorial() {
  return useContext(TutorialContext);
}

// ── Highlight box ─────────────────────────────────────────────────────────────
function HighlightBox({ rect, color }: { rect: DOMRect; color: string }) {
  const pad = 6;
  return (
    <motion.div
      key={`${rect.top}-${rect.left}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 8,
        border: `2px solid ${color}`,
        boxShadow: `0 0 0 4px ${color}20, 0 0 24px ${color}40, inset 0 0 12px ${color}08`,
        pointerEvents: "none",
        zIndex: 10001,
      }}
    >
      {/* Corner sparkles */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: "absolute",
          width: 8, height: 8,
          top: i < 2 ? -4 : "auto", bottom: i >= 2 ? -4 : "auto",
          left: i % 2 === 0 ? -4 : "auto", right: i % 2 === 1 ? -4 : "auto",
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }} />
      ))}
    </motion.div>
  );
}

// ── Tooltip card ──────────────────────────────────────────────────────────────
const ACCENT = "rgba(99,102,241,0.9)";
const ACCENT_SOFT = "rgba(165,180,252,0.85)";

function TooltipCard({
  step, stepIdx, total, rect,
  onNext, onPrev, onClose,
}: {
  step: TutorialStep;
  stepIdx: number;
  total: number;
  rect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const cardW = 340;
  const cardH = 260; // approximate
  const vp = { w: window.innerWidth, h: window.innerHeight };

  let top: number;
  let left: number;

  if (!rect) {
    // Centered
    top = vp.h / 2 - cardH / 2;
    left = vp.w / 2 - cardW / 2;
  } else {
    // Default: place below the target
    top = rect.bottom + 14;
    left = rect.left + rect.width / 2 - cardW / 2;

    // Clamp horizontally
    left = Math.max(12, Math.min(vp.w - cardW - 12, left));

    // If not enough room below, place above
    if (top + cardH > vp.h - 12) {
      top = rect.top - cardH - 14;
    }
    // If not enough room above either, center vertically
    if (top < 12) {
      top = vp.h / 2 - cardH / 2;
    }
  }

  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === total - 1;
  const progress = ((stepIdx + 1) / total) * 100;

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      style={{
        position: "fixed",
        top, left,
        width: cardW,
        zIndex: 10002,
        background: "rgba(4,7,22,0.98)",
        border: "1px solid rgba(99,102,241,0.4)",
        borderRadius: 10,
        boxShadow: "0 0 60px rgba(99,102,241,0.18), 0 24px 48px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Progress bar top */}
      <div style={{ height: 3, background: "rgba(99,102,241,0.1)" }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, rgba(99,102,241,0.6), rgba(165,180,252,0.9))`,
            boxShadow: "0 0 8px rgba(99,102,241,0.6)",
          }}
        />
      </div>

      <div style={{ padding: "18px 20px 16px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              {step.icon}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(99,102,241,0.55)", letterSpacing: "0.22em", marginBottom: 2 }}>
                ◈ TUTORIAL · STEP {stepIdx + 1}/{total}
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: ACCENT_SOFT, letterSpacing: "0.08em" }}>
                {step.title}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="button-tutorial-close"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(100,116,139,0.55)", padding: 2, flexShrink: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Description */}
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.75,
          color: "rgba(148,163,184,0.88)", margin: "0 0 12px",
        }}>
          {step.desc}
        </p>

        {/* Tip */}
        {step.tip && (
          <div style={{
            padding: "8px 12px", borderRadius: 6, marginBottom: 14,
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.2)",
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <Zap style={{ width: 11, height: 11, color: "rgba(251,191,36,0.75)", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(251,191,36,0.75)", lineHeight: 1.5 }}>
              {step.tip}
            </span>
          </div>
        )}

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 14 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: i === stepIdx ? 18 : 6,
              height: 6,
              borderRadius: 3,
              transition: "all 0.3s",
              background: i === stepIdx
                ? "rgba(99,102,241,0.9)"
                : i < stepIdx
                ? "rgba(99,102,241,0.35)"
                : "rgba(99,102,241,0.1)",
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {!isFirst && (
            <button
              onClick={onPrev}
              data-testid="button-tutorial-prev"
              style={{
                padding: "8px 14px", borderRadius: 6, cursor: "pointer",
                background: "transparent",
                border: "1px solid rgba(99,102,241,0.2)",
                color: "rgba(99,102,241,0.6)",
                fontFamily: "var(--font-mono)", fontSize: 10,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <ChevronLeft style={{ width: 12, height: 12 }} />
              BACK
            </button>
          )}
          <button
            onClick={isLast ? onClose : onNext}
            data-testid={isLast ? "button-tutorial-finish" : "button-tutorial-next"}
            style={{
              flex: 1, padding: "9px 14px", borderRadius: 6, cursor: "pointer",
              background: isLast
                ? "linear-gradient(135deg, rgba(74,222,128,0.2), rgba(74,222,128,0.1))"
                : "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(129,140,248,0.75))",
              border: isLast
                ? "1px solid rgba(74,222,128,0.4)"
                : "1px solid rgba(165,180,252,0.35)",
              color: isLast ? "rgba(134,239,172,0.95)" : "white",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.1em",
              boxShadow: isLast ? "0 0 14px rgba(74,222,128,0.15)" : "0 0 14px rgba(99,102,241,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}
          >
            {isLast ? "◆ BEGIN JOURNEY" : (
              <>NEXT <ChevronRight style={{ width: 12, height: 12 }} /></>
            )}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onClose}
            data-testid="button-tutorial-skip"
            style={{
              display: "block", width: "100%", marginTop: 10, padding: "5px 0",
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: 9,
              color: "rgba(100,116,139,0.4)", letterSpacing: "0.1em",
              textAlign: "center",
            }}
          >
            SKIP TUTORIAL
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
const LS_KEY = "liferp_tutorial_v1_done";

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // Auto-start on first ever login — mark done immediately so it never fires again
  useEffect(() => {
    const done = localStorage.getItem(LS_KEY);
    if (!done) {
      localStorage.setItem(LS_KEY, "true");
      const t = setTimeout(() => setIsActive(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const resolveTarget = useCallback((idx: number) => {
    const step = STEPS[idx];
    if (!step?.selector) { setTargetRect(null); return; }
    const el = document.querySelector(step.selector);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, []);

  // Track target element position (re-resolves on resize)
  useEffect(() => {
    if (!isActive) return;
    resolveTarget(stepIdx);

    const onResize = () => resolveTarget(stepIdx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isActive, stepIdx, resolveTarget]);

  // Keep highlight synced if element moves (e.g. sidebar animation)
  useEffect(() => {
    if (!isActive) return;
    let ticks = 0;
    const tick = () => {
      if (ticks++ < 20) { // refresh for first 20 frames after step change
        resolveTarget(stepIdx);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isActive, stepIdx, resolveTarget]);

  const startTutorial = useCallback(() => {
    setStepIdx(0);
    setIsActive(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(LS_KEY, "true");
  }, []);

  const next = useCallback(() => {
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setStepIdx(i => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      if (e.key === "Escape")     { e.preventDefault(); closeTutorial(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, next, prev, closeTutorial]);

  return (
    <TutorialContext.Provider value={{ isActive, startTutorial, closeTutorial }}>
      {children}

      <AnimatePresence>
        {isActive && (
          <>
            {/* Backdrop */}
            <motion.div
              key="tutorial-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                position: "fixed", inset: 0, zIndex: 10000,
                background: "rgba(0,0,4,0.72)",
                backdropFilter: "blur(2px)",
                pointerEvents: "none",
              }}
            />

            {/* Target highlight */}
            <AnimatePresence>
              {targetRect && (
                <HighlightBox key={`highlight-${stepIdx}`} rect={targetRect} color={ACCENT} />
              )}
            </AnimatePresence>

            {/* Tooltip card */}
            <TooltipCard
              key={`card-${stepIdx}`}
              step={STEPS[stepIdx]}
              stepIdx={stepIdx}
              total={STEPS.length}
              rect={targetRect}
              onNext={next}
              onPrev={prev}
              onClose={closeTutorial}
            />
          </>
        )}
      </AnimatePresence>
    </TutorialContext.Provider>
  );
}
