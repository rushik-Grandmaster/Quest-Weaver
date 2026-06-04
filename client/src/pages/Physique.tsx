import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Upload, X, Trash2, Lock, GitCompare, Eye,
  TrendingDown, TrendingUp, Calendar as CalendarIcon, Loader2,
  ImagePlus, Pencil, Check, Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PhysiqueEntry } from "@shared/schema";

const OWNER_USER_ID = "26147528";

// Fixed ambient particles for the page background
const BG_PARTICLES = [
  { left: "6%",  top: "10%", size: 1.5, dur: 5.5, delay: 0    },
  { left: "90%", top: "8%",  size: 2,   dur: 4.8, delay: 1.2  },
  { left: "82%", top: "50%", size: 1.5, dur: 6.2, delay: 0.6  },
  { left: "12%", top: "68%", size: 1,   dur: 5.0, delay: 2.0  },
  { left: "55%", top: "90%", size: 2,   dur: 5.8, delay: 0.4  },
  { left: "70%", top: "25%", size: 1.5, dur: 4.2, delay: 1.8  },
  { left: "30%", top: "15%", size: 1,   dur: 6.5, delay: 1.0  },
];

// ── Image compression helper ──────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const POSES: { value: string; label: string }[] = [
  { value: "front", label: "FRONT" },
  { value: "side",  label: "SIDE"  },
  { value: "back",  label: "BACK"  },
  { value: "flex",  label: "FLEX"  },
  { value: "other", label: "OTHER" },
];

// ════════════════════════════════════════════════════════════════════════════
//  PHYSIQUE PAGE
// ════════════════════════════════════════════════════════════════════════════
export default function Physique() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const isOwner = !!user && user.id === OWNER_USER_ID;

  const [showUpload, setShowUpload]   = useState(false);
  const [lightboxId, setLightboxId]   = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds]   = useState<number[]>([]);

  const { data: entries = [], isLoading } = useQuery<PhysiqueEntry[]>({
    queryKey: ["/api/physique"],
    enabled: isOwner,
  });

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const sorted = [...entries].sort(
      (a, b) => new Date(a.photoDate).getTime() - new Date(b.photoDate).getTime()
    );
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const weightDelta =
      first.weight != null && latest.weight != null ? latest.weight - first.weight : null;
    const bfDelta =
      first.bodyFat != null && latest.bodyFat != null ? latest.bodyFat - first.bodyFat : null;
    const dayCount = Math.max(
      1,
      Math.round(
        (new Date(latest.photoDate).getTime() - new Date(first.photoDate).getTime()) / 86_400_000
      )
    );
    return { count: entries.length, latest, weightDelta, bfDelta, dayCount };
  }, [entries]);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(99,102,241,0.8)" }} />
      </div>
    );
  }
  if (!isOwner) return <PrivateLockScreen />;

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto relative">

      {/* ── Ambient background particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {BG_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left, top: p.top,
              width: p.size + "px", height: p.size + "px",
              background: "rgba(129,140,248,0.5)",
              boxShadow: "0 0 5px rgba(129,140,248,0.35)",
            }}
            animate={{ y: [0, -14, 0], opacity: [0.15, 0.55, 0.15] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Page-level sweep line */}
        <motion.div
          className="absolute left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.1), transparent)" }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-wrap items-end justify-between gap-3 relative"
        style={{ zIndex: 1 }}
      >
        <div>
          <div className="hud-label flex items-center gap-2 mb-1">
            <Shield className="w-3 h-3" />
            PRIVATE ARCHIVE — RUSHIK SAMA
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-wider uppercase"
            style={{
              fontFamily: "var(--font-display)",
              background: "linear-gradient(135deg, #e2e8f0, #c7d2fe 40%, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 20px rgba(99,102,241,0.25))",
            }}
            data-testid="text-physique-title"
          >
            Physique Logs
          </h1>
          <div className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.7)", fontFamily: "var(--font-mono)" }}>
            Encrypted to one user · {entries.length} entr{entries.length === 1 ? "y" : "ies"} on record
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            data-testid="button-toggle-compare"
            className="font-mono text-xs uppercase tracking-widest"
            onClick={() => { setCompareMode((m) => !m); setCompareIds([]); }}
            style={{
              borderColor: compareMode ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.25)",
              background: compareMode ? "rgba(99,102,241,0.12)" : "transparent",
              color: compareMode ? "rgba(199,210,254,1)" : "rgba(148,163,184,0.9)",
            }}
          >
            <GitCompare className="w-3.5 h-3.5 mr-1.5" />
            {compareMode ? "Comparing" : "Compare"}
          </Button>
          <Button
            data-testid="button-add-physique"
            onClick={() => setShowUpload(true)}
            className="font-mono text-xs uppercase tracking-widest"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(129,140,248,0.85))",
              border: "1px solid rgba(165,180,252,0.5)",
              color: "white",
              boxShadow: "0 0 24px rgba(99,102,241,0.35)",
            }}
          >
            <ImagePlus className="w-3.5 h-3.5 mr-1.5" /> New Entry
          </Button>
        </div>
      </motion.div>

      {/* ── Stat strip ── */}
      <div className="relative" style={{ zIndex: 1 }}>
        {stats && <StatStrip stats={stats} />}
      </div>

      {/* ── Compare bar ── */}
      {compareMode && (
        <div
          className="mb-4 p-3 rounded flex items-center justify-between gap-3 text-xs relative"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px dashed rgba(99,102,241,0.4)",
            fontFamily: "var(--font-mono)",
            color: "rgba(199,210,254,0.95)",
            zIndex: 1,
          }}
        >
          <span>◆ Select <b>2</b> entries to compare side-by-side ({compareIds.length}/2)</span>
          {compareIds.length === 2 && (
            <Button
              size="sm"
              data-testid="button-open-compare"
              onClick={() => setLightboxId(-1)}
              className="font-mono text-[0.65rem] uppercase tracking-widest h-7"
            >
              Open Comparison
            </Button>
          )}
        </div>
      )}

      {/* ── Grid ── */}
      <div className="relative" style={{ zIndex: 1 }}>
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(99,102,241,0.7)" }} />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState onAdd={() => setShowUpload(true)} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {entries.map((e, idx) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <PhysiqueCard
                  entry={e}
                  compareMode={compareMode}
                  isSelected={compareIds.includes(e.id)}
                  onClick={() => {
                    if (compareMode) {
                      setCompareIds((prev) =>
                        prev.includes(e.id)
                          ? prev.filter((x) => x !== e.id)
                          : prev.length < 2
                          ? [...prev, e.id]
                          : [prev[1], e.id]
                      );
                    } else {
                      setLightboxId(e.id);
                    }
                  }}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            onClose={() => setShowUpload(false)}
            onSuccess={() => {
              setShowUpload(false);
              toast({ title: "Entry recorded", description: "Your physique log was saved." });
            }}
          />
        )}
        {lightboxId !== null && lightboxId > 0 && (
          <Lightbox entryId={lightboxId} entries={entries} onClose={() => setLightboxId(null)} />
        )}
        {lightboxId === -1 && compareIds.length === 2 && (
          <CompareView entries={entries.filter((e) => compareIds.includes(e.id))} onClose={() => setLightboxId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════════════════════

function PrivateLockScreen() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md text-center p-8 rounded relative overflow-hidden"
        style={{
          background: "rgba(4,7,18,0.7)",
          border: "1px solid rgba(99,102,241,0.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />

        {/* Pulsing lock */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Lock className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(248,113,113,0.9)" }} />
        </motion.div>

        <div className="hud-label mb-2">⚠ ACCESS DENIED</div>
        <h2 className="text-xl font-bold mb-2 text-system" style={{ fontFamily: "var(--font-display)" }}>
          Private Archive
        </h2>
        <p className="text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>
          This is a private vault. Only the system owner can view this page.
        </p>
      </motion.div>
    </div>
  );
}

function StatStrip({ stats }: { stats: any }) {
  const tiles = [
    { label: "ENTRIES",      value: String(stats.count) },
    { label: "LATEST WEIGHT", value: stats.latest.weight != null ? `${stats.latest.weight.toFixed(1)} kg` : "—" },
    {
      label: "WEIGHT Δ",
      value: stats.weightDelta == null ? "—" : `${stats.weightDelta >= 0 ? "+" : ""}${stats.weightDelta.toFixed(1)} kg`,
      down: stats.weightDelta != null && stats.weightDelta < 0,
    },
    {
      label: "BODY FAT Δ",
      value: stats.bfDelta == null ? "—" : `${stats.bfDelta >= 0 ? "+" : ""}${stats.bfDelta.toFixed(1)}%`,
      down: stats.bfDelta != null && stats.bfDelta < 0,
    },
    { label: "JOURNEY", value: `${stats.dayCount} d` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
      {tiles.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="px-3 py-2.5 rounded relative overflow-hidden group"
          style={{
            background: "rgba(15,23,42,0.55)",
            border: "1px solid rgba(99,102,241,0.18)",
          }}
        >
          {/* Corner accent */}
          <div className="absolute -top-px -left-px w-2 h-2 border-t border-l" style={{ borderColor: "rgba(99,102,241,0.4)" }} />

          {/* Hover glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 70%)" }}
          />

          <div className="hud-label relative z-10">{t.label}</div>
          <div
            className="font-bold mt-0.5 flex items-center gap-1.5 relative z-10"
            style={{
              fontFamily: "var(--font-mono)",
              color: t.down === undefined ? "rgba(199,210,254,0.95)"
                   : t.down ? "rgba(74,222,128,1)"
                   : "rgba(248,113,113,0.95)",
            }}
          >
            {t.down === true  && <TrendingDown className="w-3.5 h-3.5" />}
            {t.down === false && <TrendingUp   className="w-3.5 h-3.5" />}
            {t.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="py-16 text-center rounded relative overflow-hidden"
      style={{
        border: "1px dashed rgba(99,102,241,0.3)",
        background: "rgba(15,23,42,0.3)",
      }}
    >
      <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.5)" }} />
      <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.5)" }} />

      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(99,102,241,0.6)" }} />
      </motion.div>
      <div className="hud-label mb-2">◈ NO ENTRIES YET</div>
      <p className="text-sm mb-4" style={{ color: "rgba(148,163,184,0.85)" }}>
        Capture your first progress photo to start tracking the journey.
      </p>
      <Button
        data-testid="button-empty-add"
        onClick={onAdd}
        className="font-mono text-xs uppercase tracking-widest"
      >
        <ImagePlus className="w-3.5 h-3.5 mr-1.5" /> Add First Entry
      </Button>
    </motion.div>
  );
}

function PhysiqueCard({ entry, compareMode, isSelected, onClick }: {
  entry: PhysiqueEntry; compareMode: boolean; isSelected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      data-testid={`card-physique-${entry.id}`}
      className="relative aspect-[3/4] overflow-hidden rounded text-left group w-full"
      style={{
        border: isSelected ? "2px solid rgba(165,180,252,0.95)" : "1px solid rgba(99,102,241,0.2)",
        boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.25), 0 0 28px rgba(99,102,241,0.4)" : "none",
      }}
    >
      <img
        src={entry.photoUrl}
        alt={`Physique ${formatDate(entry.photoDate)}`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(4,7,18,0.05) 0%, rgba(4,7,18,0.4) 60%, rgba(4,7,18,0.92) 100%)" }}
      />

      {/* Hover scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(165,180,252,0.5), transparent)", top: "40%" }}
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        animate={{ top: ["10%", "90%", "10%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(165,180,252,0.6)" }} />
      <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(165,180,252,0.6)" }} />

      {compareMode && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
             style={{ background: isSelected ? "rgba(99,102,241,0.95)" : "rgba(4,7,18,0.7)", border: "1px solid rgba(165,180,252,0.5)" }}>
          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-0.5">
        <div className="hud-label">{(entry.pose ?? "front").toUpperCase()}</div>
        <div className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,1)" }}>
          {formatDate(entry.photoDate)}
        </div>
        {(entry.weight != null || entry.bodyFat != null) && (
          <div className="text-[0.65rem] flex gap-2 mt-1" style={{ color: "rgba(148,163,184,0.95)", fontFamily: "var(--font-mono)" }}>
            {entry.weight  != null && <span>◇ {entry.weight.toFixed(1)} kg</span>}
            {entry.bodyFat != null && <span>◇ {entry.bodyFat.toFixed(1)}%</span>}
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ── Upload modal ──────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoData, setPhotoData]   = useState<string | null>(null);
  const [pose, setPose]             = useState<string>("front");
  const [weight, setWeight]         = useState<string>("");
  const [bodyFat, setBodyFat]       = useState<string>("");
  const [notes, setNotes]           = useState<string>("");
  const [photoDate, setPhotoDate]   = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy]             = useState(false);

  const createMut = useMutation({
    mutationFn: async (payload: any) => {
      const r = await apiRequest("POST", "/api/physique", payload);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message ?? "Try again", variant: "destructive" });
    },
  });

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image only", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const compressed = await compressImage(file);
      setPhotoData(compressed);
      setPreviewUrl(compressed);
    } catch (e: any) {
      toast({ title: "Couldn't read image", description: e?.message ?? "Try another file", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!photoData) {
      toast({ title: "Photo required", description: "Pick or capture an image first.", variant: "destructive" });
      return;
    }
    const payload: any = { photoUrl: photoData, pose, photoDate: new Date(photoDate).toISOString() };
    if (weight.trim())  payload.weight  = Number(weight);
    if (bodyFat.trim()) payload.bodyFat = Number(bodyFat);
    if (notes.trim())   payload.notes   = notes.trim();
    createMut.mutate(payload);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(2,4,11,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded p-5"
        style={{
          background: "rgba(8,12,24,0.97)",
          border: "1px solid rgba(99,102,241,0.4)",
          boxShadow: "0 0 60px rgba(99,102,241,0.18)",
        }}
      >
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.9)" }} />

        <button
          onClick={onClose}
          data-testid="button-close-upload"
          className="absolute top-3 right-3 p-1 rounded hover:bg-white/10"
          aria-label="Close"
        >
          <X className="w-4 h-4" style={{ color: "rgba(148,163,184,0.9)" }} />
        </button>

        <div className="hud-label mb-1">◈ NEW PHYSIQUE ENTRY</div>
        <h3 className="text-lg font-bold mb-4 text-system" style={{ fontFamily: "var(--font-display)" }}>
          Capture Progress
        </h3>

        {/* Photo picker */}
        <div className="mb-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            data-testid="input-physique-photo"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-72 object-contain rounded"
                style={{ border: "1px solid rgba(99,102,241,0.3)", background: "rgba(0,0,0,0.4)" }}
              />
              <button
                onClick={() => { setPreviewUrl(null); setPhotoData(null); fileRef.current && (fileRef.current.value = ""); }}
                className="absolute top-2 right-2 p-1.5 rounded-full"
                style={{ background: "rgba(4,7,18,0.85)", border: "1px solid rgba(248,113,113,0.5)" }}
                data-testid="button-clear-photo"
              >
                <X className="w-3.5 h-3.5" style={{ color: "rgba(248,113,113,0.95)" }} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              data-testid="button-pick-photo"
              disabled={busy}
              className="w-full py-10 rounded flex flex-col items-center justify-center gap-2 transition-colors"
              style={{
                border: "1px dashed rgba(99,102,241,0.4)",
                background: "rgba(15,23,42,0.4)",
                color: "rgba(165,180,252,0.9)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
              }}
            >
              {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
                  <Upload className="w-6 h-6" />
                </motion.div>
              )}
              <span>{busy ? "PROCESSING..." : "TAP TO UPLOAD OR CAPTURE"}</span>
              <span className="text-[0.6rem]" style={{ color: "rgba(100,116,139,0.8)" }}>
                Auto-compressed for storage
              </span>
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="hud-label block mb-1">POSE</label>
            <Select value={pose} onValueChange={setPose}>
              <SelectTrigger data-testid="select-pose" className="font-mono text-xs uppercase tracking-wide h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="hud-label block mb-1">PHOTO DATE</label>
            <Input
              type="date"
              value={photoDate}
              onChange={(e) => setPhotoDate(e.target.value)}
              data-testid="input-photo-date"
              className="font-mono text-xs h-8"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="hud-label block mb-1">WEIGHT (kg)</label>
              <Input
                type="number"
                placeholder="Optional"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                data-testid="input-weight"
                className="font-mono text-xs h-8"
              />
            </div>
            <div>
              <label className="hud-label block mb-1">BODY FAT (%)</label>
              <Input
                type="number"
                placeholder="Optional"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                data-testid="input-body-fat"
                className="font-mono text-xs h-8"
              />
            </div>
          </div>
          <div>
            <label className="hud-label block mb-1">NOTES</label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-notes"
              className="font-mono text-xs min-h-[60px]"
            />
          </div>
        </div>

        <Button
          className="w-full font-mono text-xs uppercase tracking-widest"
          disabled={createMut.isPending || busy}
          data-testid="button-save-physique"
          onClick={submit}
        >
          {createMut.isPending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> SAVING...</> : "◈ SAVE ENTRY"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────
function Lightbox({ entryId, entries, onClose }: { entryId: number; entries: PhysiqueEntry[]; onClose: () => void }) {
  const { toast } = useToast();
  const entry = entries.find((e) => e.id === entryId);
  const [editMode, setEditMode] = useState(false);
  const [notesDraft, setNotesDraft] = useState(entry?.notes ?? "");

  const deleteMut = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/physique/${entryId}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      onClose();
      toast({ title: "Entry deleted" });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err?.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: async (notes: string) => {
      const r = await apiRequest("PATCH", `/api/physique/${entryId}`, { notes });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      setEditMode(false);
    },
    onError: (err: any) => toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  if (!entry) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(2,4,11,0.9)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col md:flex-row gap-4 w-full max-w-3xl rounded"
        style={{
          background: "rgba(8,12,24,0.98)",
          border: "1px solid rgba(99,102,241,0.4)",
          boxShadow: "0 0 80px rgba(99,102,241,0.2)",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.9)" }} />

        <button onClick={onClose} className="absolute top-2 right-2 z-10 p-1 rounded hover:bg-white/10" data-testid="button-close-lightbox">
          <X className="w-4 h-4" style={{ color: "rgba(148,163,184,0.9)" }} />
        </button>

        {/* Image */}
        <div className="md:w-1/2 flex-shrink-0 overflow-hidden" style={{ minHeight: "280px", maxHeight: "70vh" }}>
          <img src={entry.photoUrl} alt="Physique" className="w-full h-full object-contain" style={{ background: "rgba(0,0,0,0.5)" }} />
        </div>

        {/* Meta */}
        <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
          <div>
            <div className="hud-label mb-1">{(entry.pose ?? "front").toUpperCase()} VIEW</div>
            <div className="text-lg font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.95)" }}>
              {formatDate(entry.photoDate)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {entry.weight  != null && <Tile label="WEIGHT"    value={`${entry.weight.toFixed(1)} kg`} />}
            {entry.bodyFat != null && <Tile label="BODY FAT"  value={`${entry.bodyFat.toFixed(1)}%`} />}
          </div>

          {/* Notes */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="hud-label">NOTES</div>
              <button
                onClick={() => setEditMode((v) => !v)}
                className="p-1 rounded transition-colors hover:bg-white/10"
                data-testid="button-edit-notes"
              >
                <Pencil className="w-3 h-3" style={{ color: "rgba(99,102,241,0.8)" }} />
              </button>
            </div>
            {editMode ? (
              <div className="space-y-2">
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="font-mono text-xs min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateMut.mutate(notesDraft)} disabled={updateMut.isPending} className="font-mono text-xs uppercase">
                    {updateMut.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditMode(false)} className="font-mono text-xs uppercase">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "rgba(148,163,184,0.8)" }}>
                {entry.notes || <span style={{ color: "rgba(100,116,139,0.5)", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>No notes.</span>}
              </p>
            )}
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            data-testid="button-delete-physique"
            className="font-mono text-xs uppercase tracking-widest self-start"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            {deleteMut.isPending ? "Deleting…" : "Delete Entry"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="p-3 rounded"
      style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <div className="hud-label">{label}</div>
      <div className="font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.95)" }}>{value}</div>
    </div>
  );
}

function CompareView({ entries, onClose }: { entries: PhysiqueEntry[]; onClose: () => void }) {
  const [a, b] = entries;
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(2,4,11,0.9)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded overflow-hidden"
        style={{
          background: "rgba(8,12,24,0.98)",
          border: "1px solid rgba(99,102,241,0.4)",
          boxShadow: "0 0 80px rgba(99,102,241,0.18)",
        }}
      >
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.9)" }} />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.9)" }} />

        <button onClick={onClose} className="absolute top-2 right-2 z-10 p-1 rounded hover:bg-white/10" data-testid="button-close-compare">
          <X className="w-4 h-4" style={{ color: "rgba(148,163,184,0.9)" }} />
        </button>

        <div className="p-4 pb-0">
          <div className="hud-label mb-3">◈ COMPARISON VIEW</div>
        </div>

        <div className="grid grid-cols-2 gap-0">
          {[a, b].map((entry, idx) => (
            <div key={entry.id} className={`relative ${idx === 0 ? "border-r border-indigo-500/20" : ""}`}>
              <img src={entry.photoUrl} alt={formatDate(entry.photoDate)} className="w-full aspect-[3/4] object-cover" />
              <div
                className="absolute bottom-0 left-0 right-0 p-3"
                style={{ background: "linear-gradient(180deg, transparent, rgba(4,7,18,0.95))" }}
              >
                <div className="hud-label">{(entry.pose ?? "front").toUpperCase()}</div>
                <div className="text-xs font-bold" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.95)" }}>
                  {formatDate(entry.photoDate)}
                </div>
                {(entry.weight != null || entry.bodyFat != null) && (
                  <div className="text-[0.62rem] flex gap-2 mt-0.5" style={{ color: "rgba(148,163,184,0.9)", fontFamily: "var(--font-mono)" }}>
                    {entry.weight  != null && <span>◇ {entry.weight.toFixed(1)} kg</span>}
                    {entry.bodyFat != null && <span>◇ {entry.bodyFat.toFixed(1)}%</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
