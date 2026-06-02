import { useState, useEffect } from "react";

const INDIGO = "rgba(99,102,241,";
const CYAN = "rgba(34,211,238,";
const AMBER = "rgba(245,158,11,";
const RED = "rgba(239,68,68,";

function HexRing({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.07}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

function CountdownCard({ name, icon, minutes, maxMinutes, url, color }: {
  name: string; icon: string; minutes: number; maxMinutes: number; url: string; color: string;
}) {
  const pct = Math.round((minutes / maxMinutes) * 100);
  const secs = 0;
  const display = `${Math.floor(minutes)}:${String(secs).padStart(2, "0")}`;

  return (
    <div style={{
      background: "rgba(8,12,28,0.9)",
      border: `1px solid ${color}0.35)`,
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 20,
      boxShadow: `0 0 30px ${color}0.12)`,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}0.9), transparent)` }} />
      <div style={{ position: "relative", flexShrink: 0 }}>
        <HexRing pct={pct} color={`${color}0.9)`} size={88} />
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transform: "rotate(0deg)"
        }}>{icon}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", color: `${color}0.6)`, textTransform: "uppercase", marginBottom: 4 }}>
          ◆ ACTIVE SESSION
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "rgba(226,232,240,0.95)", marginBottom: 6 }}>{name}</div>
        <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 700, color: `${color}1)`, letterSpacing: "0.05em", lineHeight: 1, textShadow: `0 0 20px ${color}0.7)` }}>
          {display}<span style={{ fontSize: 13, color: `${color}0.6)`, marginLeft: 4 }}>MIN</span>
        </div>
        <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
          <div style={{
            height: "100%", width: `${pct}%`, borderRadius: 2,
            background: `linear-gradient(90deg, ${color}0.5), ${color}0.9))`,
            boxShadow: `0 0 8px ${color}0.6)`,
            transition: "width 0.5s ease"
          }} />
        </div>
        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(100,116,139,0.7)" }}>
            {Math.round(pct)}% remaining
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(100,116,139,0.7)" }}>
            {url}
          </span>
        </div>
      </div>
      <button style={{
        flexShrink: 0, padding: "8px 16px", borderRadius: 6,
        background: `linear-gradient(135deg, ${color}0.2), ${color}0.1))`,
        border: `1px solid ${color}0.5)`,
        color: `${color}1)`, fontFamily: "monospace", fontSize: 11, fontWeight: 700,
        cursor: "pointer", letterSpacing: "0.1em",
        boxShadow: `0 0 14px ${color}0.2)`,
      }}>
        LAUNCH ↗
      </button>
    </div>
  );
}

function StatBar({ label, earned, used, color }: { label: string; earned: number; used: number; color: string }) {
  const pct = earned === 0 ? 0 : Math.min(100, Math.round((used / earned) * 100));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(148,163,184,0.8)", letterSpacing: "0.1em" }}>{label}</span>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: `${color}0.9)` }}>{used}/{earned} min</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}0.5), ${color}1))`,
          boxShadow: `0 0 10px ${color}0.5)`, borderRadius: 3,
          transition: "width 0.8s ease"
        }} />
      </div>
    </div>
  );
}

function ScanLine() {
  const [y, setY] = useState(-10);
  useEffect(() => {
    const interval = setInterval(() => setY(v => v >= 110 ? -10 : v + 0.4), 16);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, height: 2,
      background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
      top: `${y}vh`, pointerEvents: "none", zIndex: 0,
      boxShadow: "0 0 20px rgba(99,102,241,0.3)",
    }} />
  );
}

export function Dashboard() {
  const [locked, setLocked] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(v => !v), 1200);
    return () => clearInterval(t);
  }, []);

  const sessions = [
    { name: "YouTube", icon: "▶", minutes: 7.5, maxMinutes: 10, url: "youtube.com", color: CYAN },
    { name: "Netflix Chill", icon: "🎬", minutes: 22, maxMinutes: 30, url: "netflix.com", color: INDIGO },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "radial-gradient(ellipse at 30% 20%, rgba(15,23,42,1) 0%, rgba(2,4,11,1) 100%)",
      padding: "32px 40px", fontFamily: "system-ui", position: "relative", overflow: "hidden",
    }}>
      <ScanLine />
      {/* Dot grid */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.9) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, position: "relative", zIndex: 1 }}>
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: `${INDIGO}0.55)`, letterSpacing: "0.3em", marginBottom: 6 }}>
            ◈ SHADOW SYSTEM · MONITOR v2.0
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "0.06em",
            background: "linear-gradient(135deg, rgba(199,210,254,1), rgba(129,140,248,0.9))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>SYSTEM MONITOR</h1>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(100,116,139,0.6)", marginTop: 4, letterSpacing: "0.15em" }}>
            SCREEN TIME ENFORCEMENT · OPERATOR: RUSHI
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6,
            background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)"
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: "rgba(34,211,238,0.9)",
              boxShadow: "0 0 8px rgba(34,211,238,0.8)",
              animation: pulse ? "none" : "none",
              opacity: pulse ? 1 : 0.4, transition: "opacity 0.3s"
            }} />
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(34,211,238,0.9)", letterSpacing: "0.15em" }}>
              {sessions.length} ACTIVE
            </span>
          </div>

          <button
            onClick={() => setLocked(!locked)}
            style={{
              padding: "8px 18px", borderRadius: 6,
              background: locked ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.08)",
              border: locked ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(99,102,241,0.35)",
              color: locked ? "rgba(252,165,165,0.95)" : "rgba(165,180,252,0.9)",
              fontFamily: "monospace", fontSize: 11, fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.12em", boxShadow: locked ? "0 0 18px rgba(239,68,68,0.2)" : "none",
              transition: "all 0.3s"
            }}
          >
            {locked ? "⚡ OVERRIDE ACTIVE" : "⚡ SYSTEM OVERRIDE"}
          </button>
        </div>
      </div>

      {locked && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(2,4,11,0.95)"
        }}>
          <div style={{
            textAlign: "center", padding: 48, borderRadius: 16,
            background: "rgba(8,12,28,0.98)", border: "1px solid rgba(239,68,68,0.4)",
            boxShadow: "0 0 80px rgba(239,68,68,0.18)"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(239,68,68,0.7)", letterSpacing: "0.3em", marginBottom: 12 }}>
              SYSTEM LOCKED
            </div>
            <h2 style={{ color: "rgba(252,165,165,0.95)", margin: "0 0 16px", fontSize: 22 }}>All Sessions Terminated</h2>
            <p style={{ color: "rgba(148,163,184,0.7)", fontFamily: "monospace", fontSize: 12, marginBottom: 24 }}>
              Override active. Return to your quests, operator.
            </p>
            <button onClick={() => setLocked(false)} style={{
              padding: "10px 24px", borderRadius: 6,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)",
              color: "rgba(252,165,165,0.9)", fontFamily: "monospace", fontSize: 11,
              cursor: "pointer", letterSpacing: "0.1em"
            }}>
              DISMISS
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, position: "relative", zIndex: 1 }}>
        {/* Left: active countdowns */}
        <div>
          <div style={{ fontFamily: "monospace", fontSize: 10, color: `${INDIGO}0.5)`, letterSpacing: "0.25em", marginBottom: 16 }}>
            ◇ ACTIVE COUNTDOWNS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sessions.map((s, i) => <CountdownCard key={i} {...s} />)}

            {/* Empty state teaser */}
            <div style={{
              border: "1px dashed rgba(99,102,241,0.15)", borderRadius: 12, padding: "20px 24px",
              display: "flex", alignItems: "center", gap: 14, opacity: 0.5
            }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", border: "2px dashed rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "rgba(99,102,241,0.4)", fontSize: 20 }}>+</span>
              </div>
              <div>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(100,116,139,0.5)", letterSpacing: "0.1em" }}>
                  NO MORE ACTIVE SESSIONS
                </div>
                <div style={{ fontSize: 13, color: "rgba(100,116,139,0.4)", marginTop: 4 }}>
                  Purchase a reward in the shop to start a session
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: stats + info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Today's stats */}
          <div style={{
            background: "rgba(8,12,28,0.9)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 12, padding: 20,
            boxShadow: "0 0 30px rgba(99,102,241,0.06)"
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: `${INDIGO}0.5)`, letterSpacing: "0.25em", marginBottom: 18 }}>
              ◈ TODAY'S STATS
            </div>
            <StatBar label="YOUTUBE" earned={20} used={10} color={CYAN} />
            <StatBar label="NETFLIX" earned={60} used={22} color={INDIGO} />
            <StatBar label="GAMING" earned={30} used={30} color={RED} />
            <StatBar label="SOCIAL MEDIA" earned={15} used={5} color={AMBER} />

            <div style={{
              marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(99,102,241,0.1)",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12
            }}>
              {[
                { label: "EARNED TODAY", value: "125 min", color: CYAN },
                { label: "USED TODAY", value: "67 min", color: AMBER },
                { label: "REMAINING", value: "58 min", color: INDIGO },
                { label: "SESSIONS", value: "4 total", color: "rgba(148,163,184," },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(100,116,139,0.6)", letterSpacing: "0.15em" }}>{label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: `${color}0.95)`, marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Grind meter */}
          <div style={{
            background: "rgba(8,12,28,0.9)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 12, padding: 20
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: `${AMBER}0.55)`, letterSpacing: "0.25em", marginBottom: 14 }}>
              ◇ GRIND vs REST
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <HexRing pct={68} color={`${AMBER}0.9)`} size={70} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: `${AMBER}1)` }}>
                  68%
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, color: "rgba(226,232,240,0.9)", fontWeight: 600 }}>Grind Score</div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(100,116,139,0.6)", marginTop: 3 }}>
                  You've earned this rest, operator.
                </div>
                <div style={{
                  marginTop: 8, padding: "4px 10px", borderRadius: 4, display: "inline-block",
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)"
                }}>
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: `${AMBER}0.85)`, letterSpacing: "0.15em" }}>
                    B RANK PRODUCTIVITY
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hint box */}
          <div style={{
            background: "rgba(239,68,68,0.04)", border: "1px dashed rgba(239,68,68,0.25)",
            borderRadius: 12, padding: 16
          }}>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(252,165,165,0.7)", letterSpacing: "0.15em", marginBottom: 8 }}>
              ⚠ SYSTEM NOTICE
            </div>
            <p style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(148,163,184,0.7)", margin: 0, lineHeight: 1.6 }}>
              Session timers are binding. When time runs out, access is revoked automatically. Use Override only in true emergencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
