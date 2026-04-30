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

  // Hooks must run unconditionally — declare before any early return.
  const [showUpload, setShowUpload] = useState(false);
  const [lightboxId, setLightboxId] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  const { data: entries = [], isLoading } = useQuery<PhysiqueEntry[]>({
    queryKey: ["/api/physique"],
    enabled: isOwner,
  });

  // Derived stats
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

  // ── Owner gate ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(99,102,241,0.8)" }} />
      </div>
    );
  }
  if (!isOwner) {
    return <PrivateLockScreen />;
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="hud-label flex items-center gap-2 mb-1">
            <Shield className="w-3 h-3" /> PRIVATE ARCHIVE — RUSHIK SAMA
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-wider uppercase text-system"
            style={{ fontFamily: "var(--font-display)" }}
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
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────── */}
      {stats && <StatStrip stats={stats} />}

      {/* ── Compare bar ─────────────────────────────────────────────── */}
      {compareMode && (
        <div
          className="mb-4 p-3 rounded flex items-center justify-between gap-3 text-xs"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px dashed rgba(99,102,241,0.4)",
            fontFamily: "var(--font-mono)",
            color: "rgba(199,210,254,0.95)",
          }}
        >
          <span>
            ◆ Select <b>2</b> entries to compare side-by-side ({compareIds.length}/2)
          </span>
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

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(99,102,241,0.7)" }} />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState onAdd={() => setShowUpload(true)} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {entries.map((e) => (
            <PhysiqueCard
              key={e.id}
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
          ))}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
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
          <Lightbox
            entryId={lightboxId}
            entries={entries}
            onClose={() => setLightboxId(null)}
          />
        )}
        {lightboxId === -1 && compareIds.length === 2 && (
          <CompareView
            entries={entries.filter((e) => compareIds.includes(e.id))}
            onClose={() => setLightboxId(null)}
          />
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
      <div
        className="max-w-md text-center p-8 rounded relative"
        style={{
          background: "rgba(4,7,18,0.7)",
          border: "1px solid rgba(99,102,241,0.25)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <Lock className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(248,113,113,0.9)" }} />
        <div className="hud-label mb-2">⚠ ACCESS DENIED</div>
        <h2 className="text-xl font-bold mb-2 text-system" style={{ fontFamily: "var(--font-display)" }}>
          Private Archive
        </h2>
        <p className="text-sm" style={{ color: "rgba(148,163,184,0.85)" }}>
          This is a private vault. Only the system owner can view this page.
        </p>
      </div>
    </div>
  );
}

function StatStrip({ stats }: { stats: NonNullable<ReturnType<typeof Object>> & any }) {
  const tiles = [
    { label: "ENTRIES", value: String(stats.count) },
    {
      label: "LATEST WEIGHT",
      value: stats.latest.weight != null ? `${stats.latest.weight.toFixed(1)} kg` : "—",
    },
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
      {tiles.map((t) => (
        <div
          key={t.label}
          className="px-3 py-2.5 rounded relative"
          style={{
            background: "rgba(15,23,42,0.55)",
            border: "1px solid rgba(99,102,241,0.18)",
          }}
        >
          <div className="hud-label">{t.label}</div>
          <div
            className="font-bold mt-0.5 flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-mono)",
              color: t.down === undefined ? "rgba(199,210,254,0.95)" :
                     t.down ? "rgba(74,222,128,1)" : "rgba(248,113,113,0.95)",
            }}
          >
            {t.down === true && <TrendingDown className="w-3.5 h-3.5" />}
            {t.down === false && <TrendingUp className="w-3.5 h-3.5" />}
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="py-16 text-center rounded relative"
      style={{
        border: "1px dashed rgba(99,102,241,0.3)",
        background: "rgba(15,23,42,0.3)",
      }}
    >
      <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(99,102,241,0.6)" }} />
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
    </div>
  );
}

function PhysiqueCard({
  entry, compareMode, isSelected, onClick,
}: {
  entry: PhysiqueEntry; compareMode: boolean; isSelected: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      layout
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      data-testid={`card-physique-${entry.id}`}
      className="relative aspect-[3/4] overflow-hidden rounded text-left group"
      style={{
        border: isSelected
          ? "2px solid rgba(165,180,252,0.95)"
          : "1px solid rgba(99,102,241,0.2)",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(99,102,241,0.25), 0 0 28px rgba(99,102,241,0.4)"
          : "none",
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
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,18,0.05) 0%, rgba(4,7,18,0.4) 60%, rgba(4,7,18,0.92) 100%)",
        }}
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
        <div
          className="text-xs font-bold"
          style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,1)" }}
        >
          {formatDate(entry.photoDate)}
        </div>
        {(entry.weight != null || entry.bodyFat != null) && (
          <div className="text-[0.65rem] flex gap-2 mt-1" style={{ color: "rgba(148,163,184,0.95)", fontFamily: "var(--font-mono)" }}>
            {entry.weight != null && <span>◇ {entry.weight.toFixed(1)} kg</span>}
            {entry.bodyFat != null && <span>◇ {entry.bodyFat.toFixed(1)}%</span>}
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ── Upload modal ─────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [pose, setPose] = useState<string>("front");
  const [weight, setWeight] = useState<string>("");
  const [bodyFat, setBodyFat] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [photoDate, setPhotoDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

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
    const payload: any = {
      photoUrl: photoData,
      pose,
      photoDate: new Date(photoDate).toISOString(),
    };
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
              {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              <span>{busy ? "PROCESSING..." : "TAP TO UPLOAD OR CAPTURE"}</span>
              <span className="text-[0.6rem]" style={{ color: "rgba(100,116,139,0.8)" }}>
                Auto-compressed for storage
              </span>
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <div className="hud-label mb-1">POSE</div>
            <Select value={pose} onValueChange={setPose}>
              <SelectTrigger data-testid="select-pose" className="font-mono text-xs uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSES.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="font-mono text-xs uppercase">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="hud-label mb-1">DATE</div>
            <Input
              type="date"
              value={photoDate}
              onChange={(e) => setPhotoDate(e.target.value)}
              data-testid="input-photo-date"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <div className="hud-label mb-1">WEIGHT (KG)</div>
            <Input
              type="number"
              step="0.1"
              placeholder="optional"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              data-testid="input-weight"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <div className="hud-label mb-1">BODY FAT (%)</div>
            <Input
              type="number"
              step="0.1"
              placeholder="optional"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              data-testid="input-bodyfat"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="hud-label mb-1">NOTES</div>
          <Textarea
            placeholder="How do you feel? Lifts, diet, sleep..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-notes"
            rows={3}
            className="text-xs"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-upload" className="flex-1 font-mono text-xs uppercase">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={createMut.isPending || !photoData}
            data-testid="button-submit-upload"
            className="flex-1 font-mono text-xs uppercase tracking-widest"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(129,140,248,0.85))",
              color: "white",
            }}
          >
            {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Save Entry
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Lightbox ─────────────────────────────────────────────────────────────
function Lightbox({
  entryId, entries, onClose,
}: { entryId: number; entries: PhysiqueEntry[]; onClose: () => void }) {
  const entry = entries.find((e) => e.id === entryId);
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [weight, setWeight] = useState<string>(entry?.weight?.toString() ?? "");
  const [bodyFat, setBodyFat] = useState<string>(entry?.bodyFat?.toString() ?? "");
  const [notes, setNotes] = useState<string>(entry?.notes ?? "");

  useEffect(() => {
    if (entry) {
      setWeight(entry.weight?.toString() ?? "");
      setBodyFat(entry.bodyFat?.toString() ?? "");
      setNotes(entry.notes ?? "");
    }
  }, [entry?.id]);

  const updateMut = useMutation({
    mutationFn: async (updates: any) => {
      const r = await apiRequest("PATCH", `/api/physique/${entryId}`, updates);
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      setEditing(false);
      toast({ title: "Updated" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/physique/${entryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/physique"] });
      onClose();
      toast({ title: "Entry deleted" });
    },
  });

  if (!entry) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6"
      style={{ background: "rgba(2,4,11,0.92)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative grid grid-cols-1 md:grid-cols-[1fr_320px] gap-3 max-w-5xl w-full max-h-full overflow-auto"
      >
        <div className="relative" style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(99,102,241,0.3)" }}>
          <img src={entry.photoUrl} alt={formatDate(entry.photoDate)} className="w-full max-h-[75vh] object-contain" />
        </div>
        <div
          className="p-4 rounded relative"
          style={{ background: "rgba(8,12,24,0.95)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          <button onClick={onClose} data-testid="button-close-lightbox"
            className="absolute top-2 right-2 p-1 rounded hover:bg-white/10" aria-label="Close">
            <X className="w-4 h-4" style={{ color: "rgba(148,163,184,0.9)" }} />
          </button>
          <div className="hud-label mb-1 flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> {(entry.pose ?? "front").toUpperCase()}
          </div>
          <h3 className="text-lg font-bold text-system mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {formatDate(entry.photoDate)}
          </h3>

          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <div className="hud-label mb-1">WEIGHT</div>
                  <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)}
                         className="font-mono text-xs" data-testid="input-edit-weight" />
                </div>
                <div>
                  <div className="hud-label mb-1">BODY FAT</div>
                  <Input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                         className="font-mono text-xs" data-testid="input-edit-bodyfat" />
                </div>
              </div>
              <div className="hud-label mb-1">NOTES</div>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="text-xs mb-3" data-testid="input-edit-notes" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 font-mono text-xs uppercase">Cancel</Button>
                <Button
                  data-testid="button-save-edit"
                  onClick={() => updateMut.mutate({
                    weight: weight.trim() ? Number(weight) : null,
                    bodyFat: bodyFat.trim() ? Number(bodyFat) : null,
                    notes: notes.trim() || null,
                  })}
                  className="flex-1 font-mono text-xs uppercase"
                >
                  {updateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <dl className="space-y-2 text-xs mb-4" style={{ fontFamily: "var(--font-mono)" }}>
                <Row label="WEIGHT" value={entry.weight != null ? `${entry.weight.toFixed(1)} kg` : "—"} />
                <Row label="BODY FAT" value={entry.bodyFat != null ? `${entry.bodyFat.toFixed(1)} %` : "—"} />
                <Row label="POSE" value={(entry.pose ?? "front").toUpperCase()} />
              </dl>
              {entry.notes && (
                <div className="mb-4 text-xs leading-relaxed p-3 rounded"
                     style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(99,102,241,0.15)", color: "rgba(199,210,254,0.95)" }}>
                  {entry.notes}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(true)} data-testid="button-edit-entry" className="flex-1 font-mono text-xs uppercase">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { if (confirm("Delete this entry permanently?")) deleteMut.mutate(); }}
                  data-testid="button-delete-entry"
                  className="flex-1 font-mono text-xs uppercase"
                  style={{ borderColor: "rgba(248,113,113,0.5)", color: "rgba(248,113,113,0.95)" }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: "rgba(99,102,241,0.12)" }}>
      <dt className="hud-label">{label}</dt>
      <dd style={{ color: "rgba(199,210,254,0.95)" }}>{value}</dd>
    </div>
  );
}

// ── Compare view ─────────────────────────────────────────────────────────
function CompareView({ entries, onClose }: { entries: PhysiqueEntry[]; onClose: () => void }) {
  const [a, b] = [...entries].sort(
    (x, y) => new Date(x.photoDate).getTime() - new Date(y.photoDate).getTime()
  );
  if (!a || !b) return null;
  const wDelta = a.weight != null && b.weight != null ? b.weight - a.weight : null;
  const bfDelta = a.bodyFat != null && b.bodyFat != null ? b.bodyFat - a.bodyFat : null;
  const days = Math.max(1, Math.round((new Date(b.photoDate).getTime() - new Date(a.photoDate).getTime()) / 86_400_000));

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6"
      style={{ background: "rgba(2,4,11,0.94)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-6xl w-full max-h-full overflow-auto"
      >
        <button onClick={onClose} data-testid="button-close-compare"
          className="absolute -top-2 -right-2 p-1.5 rounded-full z-10"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(99,102,241,0.5)" }}>
          <X className="w-4 h-4" style={{ color: "rgba(199,210,254,0.95)" }} />
        </button>

        <div className="text-center mb-4">
          <div className="hud-label">◇ COMPARISON · {days} DAY{days !== 1 ? "S" : ""} APART</div>
          <h2 className="text-2xl font-bold text-system" style={{ fontFamily: "var(--font-display)" }}>
            Progress Analysis
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {[a, b].map((e, i) => (
            <div key={e.id} className="relative">
              <div className="hud-label mb-1 px-1">{i === 0 ? "▣ BEFORE" : "▣ AFTER"} · {formatDate(e.photoDate)}</div>
              <img src={e.photoUrl} alt={formatDate(e.photoDate)}
                className="w-full max-h-[65vh] object-contain rounded"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(99,102,241,0.3)" }} />
              <div className="mt-2 text-xs flex flex-wrap gap-3" style={{ fontFamily: "var(--font-mono)", color: "rgba(199,210,254,0.95)" }}>
                {e.weight != null && <span>◇ {e.weight.toFixed(1)} kg</span>}
                {e.bodyFat != null && <span>◇ {e.bodyFat.toFixed(1)}% BF</span>}
                <span style={{ color: "rgba(148,163,184,0.85)" }}>· {(e.pose ?? "front").toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        {(wDelta != null || bfDelta != null) && (
          <div className="mt-4 p-4 rounded grid grid-cols-2 gap-3 text-center"
               style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}>
            <div>
              <div className="hud-label">WEIGHT CHANGE</div>
              <div className="text-2xl font-bold mt-1" style={{
                fontFamily: "var(--font-mono)",
                color: wDelta == null ? "rgba(148,163,184,0.7)" : wDelta < 0 ? "rgba(74,222,128,1)" : "rgba(248,113,113,0.95)",
              }}>
                {wDelta == null ? "—" : `${wDelta >= 0 ? "+" : ""}${wDelta.toFixed(1)} kg`}
              </div>
            </div>
            <div>
              <div className="hud-label">BODY FAT CHANGE</div>
              <div className="text-2xl font-bold mt-1" style={{
                fontFamily: "var(--font-mono)",
                color: bfDelta == null ? "rgba(148,163,184,0.7)" : bfDelta < 0 ? "rgba(74,222,128,1)" : "rgba(248,113,113,0.95)",
              }}>
                {bfDelta == null ? "—" : `${bfDelta >= 0 ? "+" : ""}${bfDelta.toFixed(1)}%`}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
