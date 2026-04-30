import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, Unlock, Eye, EyeOff, KeyRound, ShieldCheck, AlertTriangle,
  Loader2, Sparkles, Fingerprint,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type VaultStatus = { isSet: boolean; isUnlocked: boolean; hint: string | null };

const VAULT_KEY = ["/api/vault/status"] as const;

// ── Public helper so other UI (e.g., nav lock button) can re-query ─────────
export function useVaultStatus() {
  return useQuery<VaultStatus>({
    queryKey: VAULT_KEY,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  VAULT GATE — wrap private pages
// ════════════════════════════════════════════════════════════════════════════
export function VaultGate({
  children, sectionLabel = "Private Section",
}: { children: React.ReactNode; sectionLabel?: string }) {
  const { data: status, isLoading } = useVaultStatus();

  if (isLoading || !status) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(99,102,241,0.8)" }} />
      </div>
    );
  }

  // Vault not yet set → show first-time setup
  if (!status.isSet) return <SetupScreen sectionLabel={sectionLabel} />;
  // Vault set but locked → show unlock screen
  if (!status.isUnlocked) return <UnlockScreen sectionLabel={sectionLabel} hint={status.hint} />;
  // Unlocked → show content
  return <>{children}</>;
}

// ════════════════════════════════════════════════════════════════════════════
//  ANIMATED BACKDROP — shared chrome
// ════════════════════════════════════════════════════════════════════════════
function GateChrome({ children, accent = "indigo" }: { children: React.ReactNode; accent?: "indigo" | "amber" }) {
  // Boot/scan messages
  const lines = useMemo(
    () => [
      "› Initializing secure channel...",
      "› Verifying biometric signature...",
      "› Awaiting cipher key from operator...",
    ],
    []
  );
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= lines.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 320);
    return () => clearTimeout(t);
  }, [shown, lines.length]);

  const accentRgb = accent === "amber" ? "245,158,11" : "99,102,241";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-hidden"
         style={{ background: "rgba(2,4,11,0.97)" }}>
      {/* Ambient glow rings */}
      <motion.div
        className="absolute pointer-events-none"
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 720, height: 720,
          background: `radial-gradient(circle, rgba(${accentRgb},0.18) 0%, transparent 60%)`,
        }}
      />
      <motion.div
        className="absolute pointer-events-none"
        animate={{ scale: [1.05, 1, 1.05], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: 980, height: 980,
          border: `1px solid rgba(${accentRgb},0.12)`,
          borderRadius: "50%",
        }}
      />
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
           style={{
             backgroundImage: `radial-gradient(circle, rgba(${accentRgb},0.9) 1px, transparent 1px)`,
             backgroundSize: "28px 28px",
           }} />
      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none"
        animate={{ y: ["-10vh", "110vh"] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "linear" }}
        style={{
          background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.55), transparent)`,
          boxShadow: `0 0 18px rgba(${accentRgb},0.5)`,
        }}
      />

      {/* Boot lines top-left */}
      <div className="absolute top-4 left-4 hud-label space-y-1 max-w-[60vw]"
           style={{ fontSize: "0.6rem" }}>
        {lines.slice(0, shown).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      style={{ color: `rgba(${accentRgb},0.65)` }}>
            {l} {i < shown - 1 && <span style={{ color: "rgba(74,222,128,0.85)" }}>✓</span>}
          </motion.div>
        ))}
      </div>

      {/* Status label bottom-right */}
      <div className="absolute bottom-4 right-4 hud-label" style={{ color: `rgba(${accentRgb},0.55)`, fontSize: "0.55rem" }}>
        ◆ SHADOW SYSTEM v2.0 · ENCRYPTED CHANNEL
      </div>

      {/* Content card */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 240, delay: 0.15 }}
        className="relative w-full max-w-md rounded-lg p-6 md:p-8"
        style={{
          background: "rgba(8,12,24,0.96)",
          border: `1px solid rgba(${accentRgb},0.4)`,
          boxShadow: `0 0 80px rgba(${accentRgb},0.18), 0 20px 60px rgba(0,0,0,0.6)`,
        }}
      >
        {/* bracket corners */}
        <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: `rgba(${accentRgb},0.95)` }} />
        <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2" style={{ borderColor: `rgba(${accentRgb},0.95)` }} />
        <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2" style={{ borderColor: `rgba(${accentRgb},0.95)` }} />
        <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: `rgba(${accentRgb},0.95)` }} />
        {children}
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  UNLOCK SCREEN
// ════════════════════════════════════════════════════════════════════════════
function UnlockScreen({ sectionLabel, hint }: { sectionLabel: string; hint: string | null }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const unlockMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/vault/unlock", { password });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/diary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      toast({ title: "◆ Access granted", description: "Vault unlocked. Welcome back." });
    },
    onError: (err: any) => {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
      toast({
        title: "Access denied",
        description: err?.message ?? "Wrong cipher key.",
        variant: "destructive",
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    },
  });

  return (
    <GateChrome>
      <div className="text-center mb-5">
        <motion.div
          animate={{ rotate: [0, -2, 2, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex w-14 h-14 items-center justify-center rounded-full mb-3"
          style={{
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.5)",
            boxShadow: "0 0 26px rgba(99,102,241,0.35)",
          }}
        >
          <Lock className="w-6 h-6" style={{ color: "rgba(165,180,252,1)" }} />
        </motion.div>
        <div className="hud-label mb-1">⌬ VAULT LOCKED · {sectionLabel.toUpperCase()}</div>
        <h2 className="text-2xl font-bold tracking-wider text-system"
            style={{ fontFamily: "var(--font-display)" }}>
          Enter Cipher Key
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
          Speak the word, operator. Only then will the gate yield.
        </p>
      </div>

      <motion.form
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.4 }}
        onSubmit={(e) => { e.preventDefault(); if (password) unlockMut.mutate(); }}
        className="space-y-4"
      >
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: "rgba(165,180,252,0.7)" }} />
          <input
            ref={inputRef}
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="• • • • • • • •"
            data-testid="input-vault-password"
            autoComplete="current-password"
            disabled={unlockMut.isPending}
            className="w-full pl-10 pr-10 py-3 rounded text-base outline-none transition-colors"
            style={{
              fontFamily: "var(--font-mono)",
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(99,102,241,0.35)",
              color: "rgba(199,210,254,1)",
              letterSpacing: show ? "0.05em" : "0.4em",
            }}
            onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(165,180,252,0.85)"; (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(99,102,241,0.18)"; }}
            onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(99,102,241,0.35)"; (e.currentTarget as HTMLInputElement).style.boxShadow = "none"; }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
            data-testid="button-toggle-show"
            style={{ color: "rgba(148,163,184,0.85)" }}
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {hint && (
          <div className="flex items-start gap-2 px-3 py-2 rounded text-xs"
               style={{
                 background: "rgba(245,158,11,0.06)",
                 border: "1px dashed rgba(245,158,11,0.3)",
                 color: "rgba(252,211,77,0.95)",
                 fontFamily: "var(--font-mono)",
               }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span><span className="opacity-60">HINT:</span> {hint}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!password || unlockMut.isPending}
          data-testid="button-vault-unlock"
          className="w-full py-3 rounded font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(129,140,248,0.85))",
            color: "white",
            border: "1px solid rgba(165,180,252,0.5)",
            boxShadow: "0 0 24px rgba(99,102,241,0.35)",
          }}
        >
          {unlockMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
          {unlockMut.isPending ? "VERIFYING..." : "UNLOCK VAULT"}
        </button>

        <div className="text-center text-[0.6rem] uppercase tracking-widest pt-1"
             style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.7)" }}>
          ◇ ENCRYPTED · scrypt-256 · session-bound
        </div>
      </motion.form>
    </GateChrome>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SETUP SCREEN — first-time password creation
// ════════════════════════════════════════════════════════════════════════════
function SetupScreen({ sectionLabel }: { sectionLabel: string }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hint, setHint] = useState("");
  const [show, setShow] = useState(false);

  const setMut = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/vault/set", {
        newPassword: password,
        hint: hint || undefined,
      });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_KEY });
      queryClient.invalidateQueries({ queryKey: ["/api/diary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      toast({ title: "◆ Vault sealed", description: "Your private cipher key has been set." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to set", description: err?.message ?? "Try again", variant: "destructive" });
    },
  });

  const valid = password.length >= 4 && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <GateChrome accent="amber">
      <div className="text-center mb-5">
        <motion.div
          animate={{ y: [0, -3, 0], rotate: [0, 1, -1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex w-14 h-14 items-center justify-center rounded-full mb-3"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.5)",
            boxShadow: "0 0 26px rgba(245,158,11,0.3)",
          }}
        >
          <Sparkles className="w-6 h-6" style={{ color: "rgba(252,211,77,1)" }} />
        </motion.div>
        <div className="hud-label mb-1" style={{ color: "rgba(245,158,11,0.7)" }}>
          ◇ NEW VAULT · {sectionLabel.toUpperCase()}
        </div>
        <h2 className="text-2xl font-bold tracking-wider text-system"
            style={{ fontFamily: "var(--font-display)" }}>
          Forge Your Cipher
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
          Choose a password to seal your <b>diary & progress</b>. Only you will hold this key.
        </p>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (valid) setMut.mutate(); }}
        className="space-y-3"
      >
        <PwInput
          label="NEW CIPHER KEY"
          value={password}
          onChange={setPassword}
          show={show}
          setShow={setShow}
          testId="input-vault-new"
        />
        <PwInput
          label="CONFIRM CIPHER KEY"
          value={confirm}
          onChange={setConfirm}
          show={show}
          setShow={setShow}
          testId="input-vault-confirm"
          error={mismatch ? "Keys do not match" : undefined}
        />

        <div>
          <div className="hud-label mb-1">RECOVERY HINT (optional)</div>
          <input
            type="text"
            value={hint}
            maxLength={80}
            onChange={(e) => setHint(e.target.value)}
            placeholder="e.g. my first sword's name"
            data-testid="input-vault-hint"
            className="w-full px-3 py-2 rounded text-xs outline-none"
            style={{
              fontFamily: "var(--font-mono)",
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "rgba(199,210,254,0.95)",
            }}
          />
        </div>

        <div className="flex items-start gap-2 px-3 py-2 rounded text-[0.65rem]"
             style={{
               background: "rgba(245,158,11,0.06)",
               border: "1px dashed rgba(245,158,11,0.3)",
               color: "rgba(252,211,77,0.95)",
               fontFamily: "var(--font-mono)",
             }}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Once forged, this key cannot be recovered. Choose carefully, operator.</span>
        </div>

        <button
          type="submit"
          disabled={!valid || setMut.isPending}
          data-testid="button-vault-set"
          className="w-full py-3 rounded font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.95), rgba(252,211,77,0.85))",
            color: "rgba(28,18,3,1)",
            border: "1px solid rgba(252,211,77,0.6)",
            boxShadow: "0 0 24px rgba(245,158,11,0.35)",
            fontWeight: 700,
          }}
        >
          {setMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {setMut.isPending ? "SEALING..." : "SEAL THE VAULT"}
        </button>
      </form>
    </GateChrome>
  );
}

function PwInput({
  label, value, onChange, show, setShow, testId, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; setShow: (s: boolean) => void;
  testId: string; error?: string;
}) {
  return (
    <div>
      <div className="hud-label mb-1">{label}</div>
      <div className="relative">
        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                     style={{ color: "rgba(252,211,77,0.7)" }} />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className="w-full pl-10 pr-10 py-2.5 rounded text-sm outline-none transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            background: "rgba(15,23,42,0.7)",
            border: error ? "1px solid rgba(248,113,113,0.6)" : "1px solid rgba(99,102,241,0.3)",
            color: "rgba(199,210,254,1)",
            letterSpacing: show ? "0.05em" : "0.4em",
          }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded"
          tabIndex={-1}
          style={{ color: "rgba(148,163,184,0.85)" }}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && (
        <div className="mt-1 text-[0.65rem]" style={{ color: "rgba(248,113,113,0.95)", fontFamily: "var(--font-mono)" }}>
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Vault lock button (used in nav) — mutation hook
// ════════════════════════════════════════════════════════════════════════════
export function useLockVault() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/vault/lock", {});
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VAULT_KEY });
      queryClient.removeQueries({ queryKey: ["/api/diary"] });
      queryClient.removeQueries({ queryKey: ["/api/physique"] });
      toast({ title: "◆ Vault sealed", description: "Private sections locked." });
    },
  });
}
