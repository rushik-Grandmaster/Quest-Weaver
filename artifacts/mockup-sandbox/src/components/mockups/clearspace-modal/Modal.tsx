import { useState, useEffect, useRef } from "react";

const BREATH_DURATION = 4000;

function BreathRing({ phase }: { phase: "inhale" | "hold" | "exhale" | "idle" }) {
  const scale = phase === "inhale" ? 1.35 : phase === "hold" ? 1.35 : 1;
  const opacity = phase === "idle" ? 0.3 : 0.9;
  const color = phase === "inhale" ? "rgba(99,102,241," : phase === "hold" ? "rgba(34,211,238," : "rgba(148,163,184,";

  return (
    <div style={{ position: "relative", width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Outer pulse rings */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          border: `1px solid ${color}${opacity * 0.3})`,
          width: `${60 + i * 18}%`, height: `${60 + i * 18}%`,
          transform: `scale(${scale})`,
          transition: `transform ${BREATH_DURATION}ms ease-in-out, opacity ${BREATH_DURATION}ms ease-in-out`,
          opacity: opacity * (1 - i * 0.25),
          boxShadow: i === 1 ? `0 0 30px ${color}${opacity * 0.4})` : "none",
        }} />
      ))}

      {/* Core circle */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}0.35), ${color}0.08))`,
        border: `2px solid ${color}${opacity})`,
        transform: `scale(${scale})`,
        transition: `transform ${BREATH_DURATION}ms ease-in-out, background ${BREATH_DURATION}ms ease-in-out`,
        boxShadow: `0 0 40px ${color}${opacity * 0.6}), inset 0 0 20px ${color}0.2)`,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: 24 }}>
          {phase === "idle" ? "◈" : phase === "inhale" ? "↑" : phase === "hold" ? "◆" : "↓"}
        </span>
      </div>
    </div>
  );
}

function Timer({ seconds, total }: { seconds: number; total: number }) {
  const pct = ((total - seconds) / total) * 100;
  return (
    <div style={{ width: 200, marginTop: 8 }}>
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
        <div style={{
          height: "100%", borderRadius: 2,
          width: `${pct}%`,
          background: "linear-gradient(90deg, rgba(99,102,241,0.5), rgba(129,140,248,1))",
          boxShadow: "0 0 10px rgba(99,102,241,0.6)",
          transition: "width 1s linear"
        }} />
      </div>
    </div>
  );
}

export function Modal() {
  const [state, setState] = useState<"idle" | "breathing" | "done">("idle");
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale" | "idle">("idle");
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [breathCount, setBreathCount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalBreaths = 1;

  useEffect(() => {
    if (state !== "breathing") return;
    if (breathCount >= totalBreaths) { setState("done"); return; }

    let secs = 4;
    setSecondsLeft(secs);
    setPhase("inhale");

    countRef.current = setInterval(() => {
      secs -= 1;
      setSecondsLeft(secs);
    }, 1000);

    timerRef.current = setTimeout(() => {
      clearInterval(countRef.current!);
      setPhase("hold");
      secs = 4;
      setSecondsLeft(secs);
      countRef.current = setInterval(() => { secs -= 1; setSecondsLeft(secs); }, 1000);

      setTimeout(() => {
        clearInterval(countRef.current!);
        setPhase("exhale");
        secs = 4;
        setSecondsLeft(secs);
        countRef.current = setInterval(() => { secs -= 1; setSecondsLeft(secs); }, 1000);

        setTimeout(() => {
          clearInterval(countRef.current!);
          setBreathCount(c => c + 1);
          setState("done");
        }, BREATH_DURATION);
      }, BREATH_DURATION);
    }, BREATH_DURATION);

    return () => {
      clearTimeout(timerRef.current!);
      clearInterval(countRef.current!);
    };
  }, [state, breathCount]);

  const phaseLabel = phase === "inhale" ? "BREATHE IN..." : phase === "hold" ? "HOLD..." : phase === "exhale" ? "BREATHE OUT..." : "";

  if (confirmed) {
    return (
      <div style={{
        minHeight: "100vh", background: "rgba(2,4,11,0.97)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "system-ui"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontFamily: "monospace", fontSize: 14, color: "rgba(74,222,128,0.9)", letterSpacing: "0.2em" }}>
            PURCHASE CONFIRMED
          </div>
          <div style={{ color: "rgba(148,163,184,0.7)", marginTop: 8, fontFamily: "monospace", fontSize: 11 }}>
            Session timer started · 10 min YouTube
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 40%, rgba(15,23,42,1) 0%, rgba(2,4,11,1) 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "system-ui", position: "relative", overflow: "hidden"
    }}>
      {/* Dot grid */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.9) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />
      {/* Glow */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)",
        pointerEvents: "none"
      }} />

      {/* Modal card */}
      <div style={{
        background: "rgba(8,12,28,0.97)", borderRadius: 16,
        border: "1px solid rgba(99,102,241,0.3)",
        boxShadow: "0 0 80px rgba(99,102,241,0.12), 0 20px 60px rgba(0,0,0,0.7)",
        padding: "36px 40px", maxWidth: 480, width: "100%",
        position: "relative"
      }}>
        {/* Corner brackets */}
        {[["top:0,left:0,borderTop,borderLeft"], ["top:0,right:0,borderTop,borderRight"],
          ["bottom:0,left:0,borderBottom,borderLeft"], ["bottom:0,right:0,borderBottom,borderRight"]].map((_, i) => {
          const corners = [
            { top: -1, left: -1, borderTop: true, borderLeft: true },
            { top: -1, right: -1, borderTop: true, borderRight: true },
            { bottom: -1, left: -1, borderBottom: true, borderLeft: true },
            { bottom: -1, right: -1, borderBottom: true, borderRight: true },
          ][i];
          return (
            <div key={i} style={{
              position: "absolute", width: 16, height: 16,
              top: corners.top !== undefined ? corners.top : "auto",
              bottom: corners.bottom !== undefined ? corners.bottom : "auto",
              left: corners.left !== undefined ? corners.left : "auto",
              right: corners.right !== undefined ? corners.right : "auto",
              borderTop: corners.borderTop ? "2px solid rgba(99,102,241,0.9)" : undefined,
              borderBottom: corners.borderBottom ? "2px solid rgba(99,102,241,0.9)" : undefined,
              borderLeft: corners.borderLeft ? "2px solid rgba(99,102,241,0.9)" : undefined,
              borderRight: corners.borderRight ? "2px solid rgba(99,102,241,0.9)" : undefined,
            }} />
          );
        })}

        {/* Warning header */}
        <div style={{
          padding: "12px 16px", borderRadius: 8, marginBottom: 24,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.3)"
        }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(252,165,165,0.8)", letterSpacing: "0.2em", marginBottom: 6 }}>
            ⚠ [SYSTEM ALERT — CLEARSPACE PROTOCOL ENGAGED]
          </div>
          <p style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(203,213,225,0.85)", margin: 0, lineHeight: 1.7 }}>
            The System detects an impulse to rest. Take a deep breath. Have you truly pushed past your limits today?
          </p>
        </div>

        {/* Item info */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(99,102,241,0.55)", letterSpacing: "0.2em", marginBottom: 8 }}>
            REWARD REQUESTED
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(226,232,240,0.95)", marginBottom: 4 }}>
            ▶ 10 min YouTube
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(245,158,11,0.85)" }}>
            COST: 50 🪙 Gold
          </div>
        </div>

        {/* Breathing area */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          {state === "idle" && (
            <>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(148,163,184,0.7)", marginBottom: 20, textAlign: "center", letterSpacing: "0.1em" }}>
                Complete one deep breath cycle to unlock the purchase
              </div>
              <BreathRing phase="idle" />
              <button
                onClick={() => setState("breathing")}
                style={{
                  marginTop: 24, padding: "10px 28px", borderRadius: 8,
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.4)",
                  color: "rgba(165,180,252,0.9)", fontFamily: "monospace", fontSize: 12,
                  cursor: "pointer", letterSpacing: "0.15em", fontWeight: 700
                }}
              >
                BEGIN BREATHING ◆
              </button>
            </>
          )}

          {state === "breathing" && (
            <>
              <div style={{
                fontFamily: "monospace", fontSize: 14, fontWeight: 700, letterSpacing: "0.25em",
                color: phase === "inhale" ? "rgba(165,180,252,0.9)" : phase === "hold" ? "rgba(34,211,238,0.9)" : "rgba(148,163,184,0.7)",
                marginBottom: 20, minHeight: 20
              }}>
                {phaseLabel}
              </div>
              <BreathRing phase={phase} />
              <Timer seconds={secondsLeft} total={4} />
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(100,116,139,0.6)", marginTop: 12 }}>
                {secondsLeft}s
              </div>
            </>
          )}

          {state === "done" && (
            <>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(74,222,128,0.9)", letterSpacing: "0.2em", marginBottom: 16 }}>
                ✓ MINDFULNESS CHECK PASSED
              </div>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🌬️</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(148,163,184,0.6)", letterSpacing: "0.15em" }}>
                YOU MAY PROCEED
              </div>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{
            flex: 1, padding: "11px 0", borderRadius: 8,
            background: "transparent", border: "1px solid rgba(100,116,139,0.3)",
            color: "rgba(100,116,139,0.7)", fontFamily: "monospace", fontSize: 11,
            cursor: "pointer", letterSpacing: "0.12em"
          }}>
            ✕ CANCEL
          </button>
          <button
            disabled={state !== "done"}
            onClick={() => setConfirmed(true)}
            style={{
              flex: 2, padding: "11px 0", borderRadius: 8,
              background: state === "done"
                ? "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(129,140,248,0.85))"
                : "rgba(30,35,50,0.6)",
              border: state === "done" ? "1px solid rgba(165,180,252,0.5)" : "1px solid rgba(99,102,241,0.15)",
              color: state === "done" ? "white" : "rgba(100,116,139,0.4)",
              fontFamily: "monospace", fontSize: 11, fontWeight: 700,
              cursor: state === "done" ? "pointer" : "not-allowed",
              letterSpacing: "0.12em",
              boxShadow: state === "done" ? "0 0 24px rgba(99,102,241,0.35)" : "none",
              transition: "all 0.4s ease"
            }}
          >
            {state === "done" ? "✓ CONFIRM PURCHASE" : "🔒 BREATHE FIRST..."}
          </button>
        </div>
      </div>
    </div>
  );
}
