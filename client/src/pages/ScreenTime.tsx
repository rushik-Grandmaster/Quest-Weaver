import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Zap, X, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { RewardSession } from "@shared/schema";

function useRewardSessions() {
  return useQuery<RewardSession[]>({
    queryKey: ["/api/reward-sessions"],
    refetchInterval: 30000,
  });
}

function useEndSession() {
  return useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reward-sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reward-sessions"] }),
  });
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function CircleRing({ pct, color, size = 96 }: { pct: number; color: string; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={size * 0.07}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1s linear" }} />
    </svg>
  );
}

const COLORS = [
  "rgba(99,102,241,0.9)",
  "rgba(34,211,238,0.9)",
  "rgba(167,139,250,0.9)",
  "rgba(74,222,128,0.9)",
  "rgba(245,158,11,0.9)",
];

function SessionCard({
  session, colorIdx, now,
}: {
  session: RewardSession; colorIdx: number; now: number;
}) {
  const { mutate: endSession, isPending } = useEndSession();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);

  const expiresAt = new Date(session.expiresAt).getTime();
  const totalMs = session.minutesTotal * 60 * 1000;
  const remainingMs = Math.max(0, expiresAt - now);
  const pct = Math.round((remainingMs / totalMs) * 100);

  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const display = `${mins}:${String(secs).padStart(2, "0")}`;

  const color = COLORS[colorIdx % COLORS.length];
  const colorBase = color.replace(",0.9)", ",");

  const isExpired = remainingMs === 0;

  const handleEnd = () => {
    if (!confirming) { setConfirming(true); return; }
    endSession(session.id, {
      onSuccess: () => toast({ title: "Session ended", description: `${session.itemName} session terminated.` }),
    });
    setConfirming(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative flex items-center gap-5 p-5"
      style={{
        background: "rgba(8,12,28,0.92)",
        border: `1px solid ${colorBase}0.3)`,
        borderRadius: 8,
        boxShadow: `0 0 30px ${colorBase}0.1)`,
        overflow: "hidden",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />

      {/* Ring */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <CircleRing pct={isExpired ? 0 : pct} color={color} size={92} />
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
          color, transform: "rotate(0deg)",
        }}>
          {isExpired ? "DONE" : `${pct}%`}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.2em",
          color: `${colorBase}0.55)`, textTransform: "uppercase", marginBottom: 4,
        }}>
          ◆ {isExpired ? "EXPIRED" : "ACTIVE SESSION"}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 700, color: "rgba(226,232,240,0.95)",
          marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {session.itemName}
        </div>

        {isExpired ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(100,116,139,0.7)" }}>
            Session has expired
          </div>
        ) : (
          <>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700,
              color, letterSpacing: "0.05em", lineHeight: 1,
              textShadow: `0 0 20px ${colorBase}0.6)`,
            }}>
              {display}
              <span style={{ fontSize: 11, color: `${colorBase}0.55)`, marginLeft: 6 }}>REMAINING</span>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
              <div style={{
                height: "100%", width: `${pct}%`, borderRadius: 2,
                background: `linear-gradient(90deg, ${colorBase}0.4), ${color})`,
                boxShadow: `0 0 6px ${colorBase}0.5)`,
                transition: "width 1s linear",
              }} />
            </div>

            <div style={{
              marginTop: 5, fontFamily: "var(--font-mono)", fontSize: 9,
              color: "rgba(100,116,139,0.5)", letterSpacing: "0.12em",
            }}>
              {session.minutesTotal} MIN TOTAL ·{" "}
              {session.itemUrl && (
                <span>{session.itemUrl}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {session.itemUrl && !isExpired && (
          <a
            href={session.itemUrl.startsWith("http") ? session.itemUrl : `https://${session.itemUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`button-launch-session-${session.id}`}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              borderRadius: 5, textDecoration: "none",
              background: `${colorBase}0.12)`,
              border: `1px solid ${colorBase}0.45)`,
              color, fontFamily: "var(--font-mono)", fontSize: 10,
              fontWeight: 700, letterSpacing: "0.1em",
              boxShadow: `0 0 12px ${colorBase}0.15)`,
            }}
          >
            <ExternalLink style={{ width: 12, height: 12 }} />
            LAUNCH
          </a>
        )}
        <button
          onClick={handleEnd}
          disabled={isPending}
          data-testid={`button-end-session-${session.id}`}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 5, cursor: "pointer",
            background: confirming ? "rgba(239,68,68,0.12)" : "transparent",
            border: confirming ? "1px solid rgba(239,68,68,0.45)" : "1px solid rgba(100,116,139,0.2)",
            color: confirming ? "rgba(252,165,165,0.9)" : "rgba(100,116,139,0.6)",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            transition: "all 0.2s",
          }}
          onMouseLeave={() => setConfirming(false)}
        >
          <X style={{ width: 12, height: 12 }} />
          {confirming ? "CONFIRM?" : "END"}
        </button>
      </div>
    </motion.div>
  );
}

export default function ScreenTime() {
  const { data: sessions = [], isLoading } = useRewardSessions();
  const now = useNow();
  const [overrideMode, setOverrideMode] = useState(false);
  const { mutate: endSession } = useEndSession();
  const { toast } = useToast();

  const activeSessions = sessions.filter(s => new Date(s.expiresAt).getTime() > now);

  const handleOverride = () => {
    if (!overrideMode) {
      setOverrideMode(true);
      return;
    }
    activeSessions.forEach(s => endSession(s.id));
    toast({
      title: "⚡ System Override",
      description: "All active sessions have been terminated.",
      variant: "destructive",
    });
    setOverrideMode(false);
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <div className="hud-label mb-1">◈ SHADOW SYSTEM · MONITOR v2.0</div>
          <h1 className="text-3xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}>
            Screen Time
          </h1>
          <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: 4 }}>
            Active reward sessions &amp; countdown enforcement.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active count badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
            background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)",
            borderRadius: 5,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: activeSessions.length > 0 ? "rgba(34,211,238,0.9)" : "rgba(100,116,139,0.4)",
              boxShadow: activeSessions.length > 0 ? "0 0 8px rgba(34,211,238,0.8)" : "none",
            }} />
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 10,
              color: activeSessions.length > 0 ? "rgba(34,211,238,0.9)" : "rgba(100,116,139,0.6)",
              letterSpacing: "0.15em",
            }}>
              {activeSessions.length} ACTIVE
            </span>
          </div>

          {/* Override button */}
          <button
            onClick={handleOverride}
            data-testid="button-system-override"
            style={{
              padding: "8px 18px", borderRadius: 5, cursor: "pointer",
              background: overrideMode ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.08)",
              border: overrideMode
                ? "1px solid rgba(239,68,68,0.5)"
                : "1px solid rgba(99,102,241,0.35)",
              color: overrideMode ? "rgba(252,165,165,0.95)" : "rgba(165,180,252,0.9)",
              fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em",
              boxShadow: overrideMode ? "0 0 18px rgba(239,68,68,0.2)" : "none",
              transition: "all 0.3s",
            }}
          >
            <Zap style={{ width: 14, height: 14, display: "inline", marginRight: 6 }} />
            {overrideMode ? "⚠ CONFIRM OVERRIDE?" : "SYSTEM OVERRIDE"}
          </button>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px" style={{
        background: "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1), transparent)",
      }} />

      {/* Override warning banner */}
      <AnimatePresence>
        {overrideMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 6, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <AlertTriangle style={{ width: 16, height: 16, color: "rgba(252,165,165,0.8)", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(252,165,165,0.8)", letterSpacing: "0.15em", marginBottom: 2 }}>
                ⚠ SYSTEM OVERRIDE ARMED
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(148,163,184,0.7)", margin: 0 }}>
                Click "CONFIRM OVERRIDE?" again to terminate ALL active sessions. Move your mouse away from the button to cancel.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.3)",
            borderTop: "2px solid rgba(99,102,241,0.8)",
            animation: "spin 0.8s linear infinite",
          }} />
        </div>
      ) : activeSessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
          style={{ border: "1px dashed rgba(99,102,241,0.15)", borderRadius: 8 }}
        >
          <Monitor style={{ width: 40, height: 40, marginBottom: 16, color: "rgba(99,102,241,0.3)" }} />
          <div className="hud-label mb-2">NO ACTIVE SESSIONS</div>
          <p style={{ color: "rgba(100,116,139,0.6)", fontSize: "0.8rem", maxWidth: 320 }}>
            Purchase a screen-time reward from the shop to start a countdown session. Sessions auto-expire when time runs out.
          </p>
          <a
            href="/shop"
            style={{
              marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: 5,
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "rgba(165,180,252,0.9)",
              fontFamily: "var(--font-mono)", fontSize: 11,
              textDecoration: "none", letterSpacing: "0.1em",
            }}
          >
            → GO TO SHOP
          </a>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="hud-label mb-1">◇ ACTIVE COUNTDOWNS</div>
          <AnimatePresence>
            {activeSessions.map((session, i) => (
              <SessionCard key={session.id} session={session} colorIdx={i} now={now} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info box */}
      <div style={{
        padding: "14px 18px", borderRadius: 6,
        background: "rgba(99,102,241,0.04)",
        border: "1px dashed rgba(99,102,241,0.18)",
      }}>
        <div className="hud-label mb-2" style={{ fontSize: "0.6rem" }}>◈ SYSTEM NOTICE</div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(100,116,139,0.7)", margin: 0, lineHeight: 1.7 }}>
          Session timers are set when you purchase a screen-time reward from the shop. The breathing exercise (ClearSpace) runs before each purchase. Sessions expire automatically when time runs out. Use Override only in true emergencies.
        </p>
      </div>
    </div>
  );
}
