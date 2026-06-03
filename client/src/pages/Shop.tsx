import { useState, useEffect, useRef } from "react";
import { useShopItems, useBuyItem, useCreateShopItem } from "@/hooks/use-shop";
import { useUserStats } from "@/hooks/use-gamification";
import { Loader2, Lock, Plus, Coins, ShoppingBag, Sparkles, Gift, Star, Package, Zap, Coffee, Gamepad2, Music, Book, Shirt, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertShopItemSchema, type InsertShopItem } from "@shared/schema";
import { useSound } from "@/hooks/use-sound";
import { useLocation } from "wouter";

const ICON_MAP: Record<string, React.ReactNode> = {
  gift:     <Gift className="w-8 h-8" />,
  star:     <Star className="w-8 h-8" />,
  zap:      <Zap className="w-8 h-8" />,
  coffee:   <Coffee className="w-8 h-8" />,
  game:     <Gamepad2 className="w-8 h-8" />,
  music:    <Music className="w-8 h-8" />,
  book:     <Book className="w-8 h-8" />,
  shirt:    <Shirt className="w-8 h-8" />,
  package:  <Package className="w-8 h-8" />,
  sparkles: <Sparkles className="w-8 h-8" />,
  monitor:  <Monitor className="w-8 h-8" />,
};

function getItemColor(cost: number) {
  if (cost >= 1000) return { color: "#f59e0b", glow: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.4)", label: "LEGENDARY" };
  if (cost >= 500)  return { color: "#a78bfa", glow: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)", label: "EPIC" };
  if (cost >= 200)  return { color: "#60a5fa", glow: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)", label: "RARE" };
  return { color: "#4ade80", glow: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", label: "COMMON" };
}

// ── ClearSpace Modal ──────────────────────────────────────────────────────────
const BREATH_MS = 4000;

function BreathRing({ phase }: { phase: "idle" | "inhale" | "hold" | "exhale" }) {
  const scale = phase === "inhale" || phase === "hold" ? 1.3 : 1;
  const isIdle = phase === "idle";
  const color = phase === "inhale"
    ? "rgba(99,102,241,"
    : phase === "hold"
    ? "rgba(34,211,238,"
    : "rgba(148,163,184,";

  return (
    <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[1, 2].map(i => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          border: `1px solid ${color}${isIdle ? 0.15 : 0.25})`,
          width: `${55 + i * 20}%`, height: `${55 + i * 20}%`,
          transform: `scale(${scale})`,
          transition: `transform ${BREATH_MS}ms ease-in-out`,
          opacity: isIdle ? 0.3 : 0.7 - i * 0.2,
        }} />
      ))}
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: isIdle
          ? "rgba(99,102,241,0.04)"
          : `radial-gradient(circle, ${color}0.3), ${color}0.06))`,
        border: `2px solid ${color}${isIdle ? 0.2 : 0.7})`,
        transform: `scale(${scale})`,
        transition: `transform ${BREATH_MS}ms ease-in-out, border-color ${BREATH_MS}ms ease-in-out`,
        boxShadow: isIdle ? "none" : `0 0 36px ${color}0.5), inset 0 0 18px ${color}0.15)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, color: isIdle ? "rgba(99,102,241,0.3)" : `${color}0.9)`,
      }}>
        {phase === "idle" ? "◈" : phase === "inhale" ? "↑" : phase === "hold" ? "◆" : "↓"}
      </div>
    </div>
  );
}

function ClearSpaceModal({
  item,
  onConfirm,
  onCancel,
}: {
  item: any;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<"idle" | "breathing" | "done">("idle");
  const [phase, setPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [secsLeft, setSecsLeft] = useState(4);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startBreath = () => {
    setState("breathing");
    let secs = 4;
    setSecsLeft(secs);
    setPhase("inhale");

    const tick = setInterval(() => {
      secs -= 1;
      setSecsLeft(secs);
    }, 1000);

    const t1 = setTimeout(() => {
      clearInterval(tick);
      setPhase("hold");
      let s2 = 4;
      setSecsLeft(s2);
      const tick2 = setInterval(() => { s2 -= 1; setSecsLeft(s2); }, 1000);

      const t2 = setTimeout(() => {
        clearInterval(tick2);
        setPhase("exhale");
        let s3 = 4;
        setSecsLeft(s3);
        const tick3 = setInterval(() => { s3 -= 1; setSecsLeft(s3); }, 1000);

        const t3 = setTimeout(() => {
          clearInterval(tick3);
          setState("done");
          setPhase("idle");
        }, BREATH_MS);
        timersRef.current.push(t3);
      }, BREATH_MS);
      timersRef.current.push(t2);
    }, BREATH_MS);
    timersRef.current.push(t1);
  };

  useEffect(() => () => clearTimers(), []);

  const phaseLabel = phase === "inhale" ? "BREATHE IN..." : phase === "hold" ? "HOLD..." : phase === "exhale" ? "BREATHE OUT..." : "";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(2,4,11,0.92)", backdropFilter: "blur(16px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {/* Glow */}
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          background: "rgba(8,12,28,0.99)", borderRadius: 12,
          border: "1px solid rgba(99,102,241,0.35)",
          boxShadow: "0 0 80px rgba(99,102,241,0.15), 0 20px 60px rgba(0,0,0,0.7)",
          padding: "36px 40px", maxWidth: 460, width: "100%",
          position: "relative",
        }}
      >
        {/* Corner brackets */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position: "absolute", width: 14, height: 14,
            top: i < 2 ? -1 : "auto", bottom: i >= 2 ? -1 : "auto",
            left: i % 2 === 0 ? -1 : "auto", right: i % 2 === 1 ? -1 : "auto",
            borderTop: i < 2 ? "2px solid rgba(99,102,241,0.9)" : undefined,
            borderBottom: i >= 2 ? "2px solid rgba(99,102,241,0.9)" : undefined,
            borderLeft: i % 2 === 0 ? "2px solid rgba(99,102,241,0.9)" : undefined,
            borderRight: i % 2 === 1 ? "2px solid rgba(99,102,241,0.9)" : undefined,
          }} />
        ))}

        {/* Alert banner */}
        <div style={{
          padding: "10px 14px", borderRadius: 6, marginBottom: 22,
          background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.28)",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(252,165,165,0.75)", letterSpacing: "0.2em", marginBottom: 5 }}>
            ⚠ [SYSTEM ALERT — CLEARSPACE PROTOCOL ENGAGED]
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(203,213,225,0.8)", margin: 0, lineHeight: 1.7 }}>
            The System detects an impulse to rest. Take a deep breath. Have you truly pushed past your limits today?
          </p>
        </div>

        {/* Item info */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(99,102,241,0.5)", letterSpacing: "0.2em", marginBottom: 6 }}>
            REWARD REQUESTED
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(226,232,240,0.95)", marginBottom: 3 }}>
            {item.name}
          </div>
          {item.durationMinutes && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(34,211,238,0.7)", marginBottom: 4 }}>
              ⏱ {item.durationMinutes} MIN SESSION
            </div>
          )}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(245,158,11,0.85)" }}>
            COST: {item.cost} 🪙 GOLD
          </div>
        </div>

        {/* Breathing area */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26, minHeight: 200 }}>
          {state === "idle" && (
            <>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(148,163,184,0.65)", marginBottom: 18, textAlign: "center", letterSpacing: "0.08em" }}>
                Complete one breath cycle to unlock the purchase
              </div>
              <BreathRing phase="idle" />
              <button
                onClick={startBreath}
                data-testid="button-clearspace-begin"
                style={{
                  marginTop: 20, padding: "9px 24px", borderRadius: 6,
                  background: "rgba(99,102,241,0.09)", border: "1px solid rgba(99,102,241,0.38)",
                  color: "rgba(165,180,252,0.9)", fontFamily: "var(--font-mono)",
                  fontSize: 11, cursor: "pointer", letterSpacing: "0.14em", fontWeight: 700,
                }}
              >
                BEGIN BREATHING ◆
              </button>
            </>
          )}

          {state === "breathing" && (
            <>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.22em", minHeight: 20, marginBottom: 16,
                color: phase === "inhale"
                  ? "rgba(165,180,252,0.9)"
                  : phase === "hold"
                  ? "rgba(34,211,238,0.9)"
                  : "rgba(148,163,184,0.7)",
              }}>
                {phaseLabel}
              </div>
              <BreathRing phase={phase} />
              <div style={{
                marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 24,
                fontWeight: 700, color: "rgba(165,180,252,0.6)",
              }}>
                {secsLeft}
              </div>
            </>
          )}

          {state === "done" && (
            <>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(74,222,128,0.9)", letterSpacing: "0.2em", marginBottom: 14 }}>
                ✓ MINDFULNESS CHECK PASSED
              </div>
              <div style={{ fontSize: 52 }}>🌬️</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(148,163,184,0.5)", marginTop: 8, letterSpacing: "0.15em" }}>
                YOU MAY PROCEED
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            data-testid="button-clearspace-cancel"
            style={{
              flex: 1, padding: "10px 0", borderRadius: 6, cursor: "pointer",
              background: "transparent", border: "1px solid rgba(100,116,139,0.28)",
              color: "rgba(100,116,139,0.65)", fontFamily: "var(--font-mono)",
              fontSize: 10, letterSpacing: "0.12em",
            }}
          >
            ✕ CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={state !== "done"}
            data-testid="button-clearspace-confirm"
            style={{
              flex: 2, padding: "10px 0", borderRadius: 6,
              cursor: state === "done" ? "pointer" : "not-allowed",
              background: state === "done"
                ? "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(129,140,248,0.85))"
                : "rgba(20,25,45,0.6)",
              border: state === "done"
                ? "1px solid rgba(165,180,252,0.5)"
                : "1px solid rgba(99,102,241,0.12)",
              color: state === "done" ? "white" : "rgba(100,116,139,0.38)",
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.12em",
              boxShadow: state === "done" ? "0 0 24px rgba(99,102,241,0.35)" : "none",
              transition: "all 0.4s ease",
            }}
          >
            {state === "done" ? "✓ CONFIRM PURCHASE" : "🔒 BREATHE FIRST..."}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function ShopItemCard({ item, canAfford, onBuy, isBuying }: {
  item: any; canAfford: boolean; onBuy: () => void; isBuying: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [justBought, setJustBought] = useState(false);
  const rarity = getItemColor(item.cost);
  const isScreenTime = !!(item.durationMinutes && item.durationMinutes > 0);

  const handleBuy = () => {
    if (!canAfford || isBuying) return;
    setJustBought(true);
    setTimeout(() => setJustBought(false), 1500);
    onBuy();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col"
      style={{
        background: hovered && canAfford
          ? `linear-gradient(135deg, ${rarity.glow} 0%, rgba(4,7,18,0.98) 60%)`
          : "rgba(6,10,26,0.9)",
        border: `1px solid ${hovered && canAfford ? rarity.border : canAfford ? rarity.border + "55" : "rgba(30,35,60,0.6)"}`,
        borderRadius: "4px",
        boxShadow: hovered && canAfford ? `0 0 24px ${rarity.glow}` : "none",
        transition: "all 0.25s ease",
        opacity: canAfford ? 1 : 0.55,
      }}
    >
      {/* Corner brackets on hover */}
      {hovered && canAfford && (
        <>
          <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: rarity.color }} />
        </>
      )}

      <div className="p-5 flex flex-col items-center text-center flex-1">
        {/* Rarity badge */}
        <div className="self-end mb-2 flex items-center gap-2">
          {isScreenTime && (
            <span className="hud-label px-2 py-0.5" style={{
              background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.3)",
              color: "rgba(34,211,238,0.85)", borderRadius: "3px", fontSize: "0.5rem",
            }}>
              ⏱ {item.durationMinutes}m
            </span>
          )}
          <span className="hud-label px-2 py-0.5" style={{
            background: `${rarity.color}15`, border: `1px solid ${rarity.color}33`,
            color: rarity.color, borderRadius: "3px", fontSize: "0.5rem",
          }}>
            {rarity.label}
          </span>
        </div>

        {/* Icon */}
        <div
          className="w-20 h-20 flex items-center justify-center mb-4 flex-shrink-0"
          style={{
            background: canAfford ? `${rarity.glow}` : "rgba(15,20,40,0.6)",
            border: `1px solid ${canAfford ? rarity.border : "rgba(30,35,60,0.5)"}`,
            borderRadius: "4px",
            color: canAfford ? rarity.color : "rgba(50,60,90,0.7)",
            boxShadow: hovered && canAfford ? `0 0 16px ${rarity.glow}` : "none",
            transition: "all 0.25s ease",
          }}
        >
          {ICON_MAP[item.icon] ?? <Gift className="w-8 h-8" />}
        </div>

        <h3
          className="font-bold mb-1"
          style={{ color: canAfford ? "rgba(199,210,254,0.95)" : "rgba(70,85,120,0.8)", fontSize: "0.95rem" }}
        >
          {item.name}
        </h3>
        <p className="text-xs mb-5 flex-1" style={{ color: "rgba(100,116,139,0.75)", lineHeight: 1.5 }}>
          {item.description}
        </p>

        {/* Buy button */}
        <button
          onClick={handleBuy}
          disabled={!canAfford || isBuying}
          data-testid={`button-buy-${item.id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 font-bold transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            letterSpacing: "0.08em",
            borderRadius: "3px",
            background: justBought
              ? "rgba(74,222,128,0.15)"
              : canAfford
              ? hovered ? `${rarity.color}22` : "rgba(15,20,40,0.8)"
              : "rgba(15,20,40,0.5)",
            border: justBought
              ? "1px solid rgba(74,222,128,0.5)"
              : canAfford
              ? `1px solid ${hovered ? rarity.border : rarity.border + "55"}`
              : "1px solid rgba(30,35,60,0.5)",
            color: justBought
              ? "rgba(74,222,128,0.9)"
              : canAfford
              ? hovered ? rarity.color : "rgba(148,163,184,0.8)"
              : "rgba(50,60,90,0.7)",
            cursor: canAfford ? "pointer" : "not-allowed",
          }}
        >
          {!canAfford && <Lock className="w-3 h-3" />}
          <Coins className="w-3.5 h-3.5" />
          {justBought ? "PURCHASED" : `${item.cost} GOLD`}
          {isScreenTime && canAfford && <Monitor className="w-3 h-3 opacity-60" />}
        </button>
      </div>
    </motion.div>
  );
}

export default function Shop() {
  const { data: items, isLoading } = useShopItems();
  const { data: stats } = useUserStats();
  const { mutate: buyItem, isPending: isBuying } = useBuyItem();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clearSpaceItem, setClearSpaceItem] = useState<any | null>(null);
  const [, setLocation] = useLocation();

  const handleBuy = (item: any) => {
    if (!stats || stats.points < item.cost) {
      toast({ title: "Insufficient Funds", description: "You need more gold.", variant: "destructive" });
      return;
    }
    // Screen-time items get the ClearSpace intervention
    if (item.durationMinutes && item.durationMinutes > 0) {
      setClearSpaceItem(item);
      return;
    }
    playSound("gold");
    buyItem(item.id);
  };

  const handleClearSpaceConfirm = () => {
    if (!clearSpaceItem) return;
    playSound("gold");
    buyItem(clearSpaceItem.id, {
      onSuccess: (data: any) => {
        setClearSpaceItem(null);
        if (data?.rewardSession) {
          toast({ title: "Session started!", description: `Your ${clearSpaceItem.name} session is now active.` });
          setLocation("/screen-time");
        }
      },
    });
    setClearSpaceItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const gold = stats?.points ?? 0;

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* ClearSpace Modal */}
      <AnimatePresence>
        {clearSpaceItem && (
          <ClearSpaceModal
            item={clearSpaceItem}
            onConfirm={handleClearSpaceConfirm}
            onCancel={() => setClearSpaceItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="hud-label mb-1">◈ SHADOW MARKET</div>
          <h1
            className="text-3xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
          >
            Item Shop
          </h1>
          <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: "4px" }}>
            Redeem your hard-earned gold for real-life rewards.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Gold balance */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "4px",
            }}
          >
            <Coins className="w-5 h-5" style={{ color: "rgba(245,158,11,0.9)" }} />
            <div>
              <div className="hud-label" style={{ color: "rgba(245,158,11,0.6)", fontSize: "0.5rem" }}>GOLD BALANCE</div>
              <span
                className="font-black text-xl"
                style={{ fontFamily: "var(--font-mono)", color: "rgba(245,158,11,1)" }}
              >
                {gold.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add item button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-item"
            className="flex items-center gap-2 px-4 py-3 font-bold transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.35)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.9)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(99,102,241,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <Plus className="w-4 h-4" />
            ADD REWARD
          </button>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1), transparent)" }} />

      {/* Items grid */}
      {items && items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          style={{ border: "1px dashed rgba(99,102,241,0.2)", borderRadius: "4px" }}
        >
          <ShoppingBag className="w-10 h-10 mb-4" style={{ color: "rgba(99,102,241,0.3)" }} />
          <div className="hud-label mb-2">NO ITEMS AVAILABLE</div>
          <p style={{ color: "rgba(100,116,139,0.6)", fontSize: "0.8rem" }}>Add your first custom reward to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items?.map((item, i) => {
            const canAfford = gold >= item.cost;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <ShopItemCard
                  item={item}
                  canAfford={canAfford}
                  onBuy={() => handleBuy(item)}
                  isBuying={isBuying}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateItemDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

// ── Extended insert schema with optional url + durationMinutes ────────────────
const createItemSchema = insertShopItemSchema.extend({
  url: z.string().url("Enter a valid URL (e.g. https://youtube.com)").optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(1).max(480).optional().nullable(),
});
type CreateItemData = z.infer<typeof createItemSchema>;

function CreateItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createItem, isPending } = useCreateShopItem();
  const { toast } = useToast();
  const form = useForm<CreateItemData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: { name: "", description: "", cost: 100, category: "custom", icon: "gift", url: "", durationMinutes: null },
  });

  const onSubmit = (data: CreateItemData) => {
    const payload: any = {
      ...data,
      url: data.url || null,
      durationMinutes: data.durationMinutes || null,
    };
    createItem(payload, {
      onSuccess: () => {
        toast({ title: "Reward Created", description: "Your custom reward is now in the shop." });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({ title: "Failed to create item", description: error.message || "Something went wrong", variant: "destructive" });
      },
    });
  };

  const watchDuration = form.watch("durationMinutes");
  const isScreenTime = !!(watchDuration && Number(watchDuration) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[460px]"
        style={{
          background: "rgba(4,7,18,0.98)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(99,102,241,0.15)",
        }}
      >
        <DialogHeader>
          <div className="hud-label mb-1">◈ SYSTEM REGISTER</div>
          <DialogTitle
            className="text-xl font-black tracking-wider uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
          >
            Create Custom Reward
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Field label="REWARD NAME" error={form.formState.errors.name?.message}>
            <Input
              {...form.register("name")}
              placeholder="e.g., Movie Night"
              data-testid="input-item-name"
              style={inputStyle}
            />
          </Field>

          <Field label="DESCRIPTION" error={form.formState.errors.description?.message}>
            <Textarea
              {...form.register("description")}
              placeholder="What does this reward unlock?"
              rows={2}
              data-testid="input-item-description"
              style={{ ...inputStyle, resize: "none" }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="GOLD COST" error={form.formState.errors.cost?.message}>
              <Input
                type="number"
                {...form.register("cost", { valueAsNumber: true })}
                placeholder="100"
                data-testid="input-item-cost"
                style={inputStyle}
              />
            </Field>

            <Field label="ICON">
              <Select onValueChange={val => form.setValue("icon", val)} defaultValue="gift">
                <SelectTrigger style={inputStyle} data-testid="select-item-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "rgba(6,10,26,0.98)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  {["gift", "star", "zap", "coffee", "game", "music", "book", "shirt", "package", "sparkles", "monitor"].map(v => (
                    <SelectItem key={v} value={v} style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                      {v.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Screen-time section */}
          <div style={{
            padding: "14px", borderRadius: "4px",
            background: isScreenTime ? "rgba(34,211,238,0.04)" : "rgba(99,102,241,0.03)",
            border: `1px solid ${isScreenTime ? "rgba(34,211,238,0.25)" : "rgba(99,102,241,0.12)"}`,
            transition: "all 0.3s",
          }}>
            <div className="hud-label mb-3" style={{ fontSize: "0.55rem", color: isScreenTime ? "rgba(34,211,238,0.7)" : "rgba(99,102,241,0.45)" }}>
              ⏱ SCREEN-TIME SETTINGS (OPTIONAL)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="DURATION (MIN)" error={form.formState.errors.durationMinutes?.message}>
                <Input
                  type="number"
                  {...form.register("durationMinutes", { setValueAs: v => v === "" ? null : Number(v) })}
                  placeholder="e.g. 30"
                  data-testid="input-item-duration"
                  min={1} max={480}
                  style={inputStyle}
                />
              </Field>
              <Field label="LAUNCH URL" error={(form.formState.errors as any).url?.message}>
                <Input
                  {...form.register("url")}
                  placeholder="https://youtube.com"
                  data-testid="input-item-url"
                  style={inputStyle}
                />
              </Field>
            </div>
            {isScreenTime && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(34,211,238,0.55)", marginTop: 8, letterSpacing: "0.1em" }}>
                ◆ ClearSpace breathing gate will trigger on purchase · Session timer will appear on the Screen Time page
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-create-item"
            className="w-full py-3 font-bold tracking-widest transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              background: isPending ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.9)",
            }}
          >
            {isPending ? "REGISTERING..." : "◈ REGISTER REWARD"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="hud-label">{label}</label>
      {children}
      {error && <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>{error}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(6,10,26,0.8)",
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: "3px",
  color: "rgba(199,210,254,0.9)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.82rem",
};
