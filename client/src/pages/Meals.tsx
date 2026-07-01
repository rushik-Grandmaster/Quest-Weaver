import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Utensils, Plus, Trash2, Sparkles, Flame, Zap, Droplets, Loader as Loader2, X, ChevronDown, ChevronUp, ChartBar as BarChart3, Coffee, Sun, Moon, Apple, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useMealEntries,
  useCreateMealEntry,
  useDeleteMealEntry,
  useAnalyzeMeal,
} from "@/hooks/use-meals";
import type { MealEntry } from "@shared/schema";
import { format, isToday, isYesterday, parseISO, startOfDay, isSameDay } from "date-fns";

// ── Constants ────────────────────────────────────────────────────────────────
const MEAL_TYPES = [
  { value: "breakfast", label: "BREAKFAST", icon: Sun,     color: "rgba(251,191,36," },
  { value: "lunch",     label: "LUNCH",     icon: Utensils, color: "rgba(74,222,128," },
  { value: "dinner",    label: "DINNER",    icon: Moon,     color: "rgba(99,102,241," },
  { value: "snack",     label: "SNACK",     icon: Apple,    color: "rgba(249,115,22," },
];

const DAILY_GOALS = { calories: 2000, protein: 150, carbs: 250, fat: 65, fiber: 30 };

function mealTypeConfig(type: string) {
  return MEAL_TYPES.find(m => m.value === type) ?? MEAL_TYPES[3];
}

// ── Form schema ───────────────────────────────────────────────────────────────
const mealFormSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.coerce.number().int().min(0).max(99999),
  protein: z.coerce.number().min(0).max(9999).optional().nullable(),
  carbs: z.coerce.number().min(0).max(9999).optional().nullable(),
  fat: z.coerce.number().min(0).max(9999).optional().nullable(),
  fiber: z.coerce.number().min(0).max(9999).optional().nullable(),
  notes: z.string().max(500).optional(),
});
type MealFormData = z.infer<typeof mealFormSchema>;

// ── Macro pill ────────────────────────────────────────────────────────────────
function MacroPill({ label, value, unit, color }: { label: string; value: number | null | undefined; unit: string; color: string }) {
  if (value == null) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px", borderRadius: 3,
      background: `${color}0.08)`, border: `1px solid ${color}0.25)`,
      fontFamily: "var(--font-mono)", fontSize: 9,
      color: `${color}0.9)`, letterSpacing: "0.08em",
    }}>
      {label}: {value.toFixed(1)}{unit}
    </span>
  );
}

// ── Daily progress ring ───────────────────────────────────────────────────────
function CircleProgress({ value, max, color, size = 64, label, sub }: {
  value: number; max: number; color: string; size?: number; label: string; sub: string;
}) {
  const pct = Math.min(1, value / max);
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(30,40,70,0.8)" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={`${color}0.85)`} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div style={{ textAlign: "center", marginTop: -4 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: `${color}0.95)` }}>
          {label}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(100,116,139,0.7)" }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

// ── Luminous analysis panel ───────────────────────────────────────────────────
function LuminousPanel({ mealName, notes, onApply, onClose }: {
  mealName: string; notes?: string;
  onApply: (data: Partial<MealFormData>) => void;
  onClose: () => void;
}) {
  const { mutate: analyze, isPending, data, error } = useAnalyzeMeal();

  const handleAnalyze = () => analyze({ mealName, notes });

  return (
    <div style={{
      padding: "14px", borderRadius: "4px",
      background: "rgba(99,102,241,0.04)",
      border: "1px solid rgba(99,102,241,0.22)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles style={{ width: 12, height: 12, color: "rgba(165,180,252,0.8)" }} />
          <span className="hud-label" style={{ fontSize: "0.55rem", color: "rgba(165,180,252,0.8)" }}>
            LUMINOUS ANALYSIS
          </span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <X style={{ width: 11, height: 11, color: "rgba(100,116,139,0.6)" }} />
        </button>
      </div>

      {!data && !isPending && (
        <div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(148,163,184,0.65)", marginBottom: 10, lineHeight: 1.6 }}>
            ◇ Luminous will estimate calories and macros for <strong style={{ color: "rgba(165,180,252,0.85)" }}>{mealName || "this meal"}</strong>
          </p>
          <button
            onClick={handleAnalyze}
            disabled={!mealName}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 3,
              background: mealName ? "rgba(99,102,241,0.12)" : "rgba(20,25,45,0.5)",
              border: `1px solid ${mealName ? "rgba(99,102,241,0.4)" : "rgba(30,35,60,0.4)"}`,
              color: mealName ? "rgba(165,180,252,0.9)" : "rgba(60,70,100,0.6)",
              fontFamily: "var(--font-mono)", fontSize: 10, cursor: mealName ? "pointer" : "not-allowed",
              letterSpacing: "0.1em",
            }}
          >
            ◆ ANALYZE WITH LUMINOUS
          </button>
        </div>
      )}

      {isPending && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0" }}>
          <Loader2 style={{ width: 14, height: 14, color: "rgba(99,102,241,0.7)" }} className="animate-spin" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(148,163,184,0.6)" }}>
            Luminous is processing...
          </span>
        </div>
      )}

      {error && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(239,68,68,0.8)", marginTop: 6 }}>
          ✕ {(error as Error).message}
        </p>
      )}

      {data && !isPending && (
        <div>
          {/* Health score */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{
              padding: "3px 8px", borderRadius: 3,
              background: data.healthScore >= 7
                ? "rgba(74,222,128,0.1)" : data.healthScore >= 4
                ? "rgba(251,191,36,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${data.healthScore >= 7
                ? "rgba(74,222,128,0.35)" : data.healthScore >= 4
                ? "rgba(251,191,36,0.35)" : "rgba(239,68,68,0.35)"}`,
              fontFamily: "var(--font-mono)", fontSize: 9,
              color: data.healthScore >= 7
                ? "rgba(74,222,128,0.9)" : data.healthScore >= 4
                ? "rgba(251,191,36,0.9)" : "rgba(239,68,68,0.9)",
            }}>
              HEALTH: {data.healthScore}/10
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(245,158,11,0.85)", fontWeight: 700 }}>
              ~{data.calories} kcal
            </span>
          </div>

          {/* Analysis text */}
          {data.analysis && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(148,163,184,0.75)", lineHeight: 1.7, marginBottom: 10 }}>
              {data.analysis}
            </p>
          )}

          {/* Macros row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            <MacroPill label="P" value={data.protein} unit="g" color="rgba(99,102,241," />
            <MacroPill label="C" value={data.carbs} unit="g" color="rgba(34,211,238," />
            <MacroPill label="F" value={data.fat} unit="g" color="rgba(251,191,36," />
            <MacroPill label="Fi" value={data.fiber} unit="g" color="rgba(74,222,128," />
          </div>

          <button
            onClick={() => onApply({
              calories: data.calories,
              protein: data.protein,
              carbs: data.carbs,
              fat: data.fat,
              fiber: data.fiber,
            })}
            style={{
              width: "100%", padding: "8px 0", borderRadius: 3,
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.1))",
              border: "1px solid rgba(99,102,241,0.45)",
              color: "rgba(165,180,252,0.95)", fontFamily: "var(--font-mono)", fontSize: 10,
              cursor: "pointer", letterSpacing: "0.1em", fontWeight: 700,
            }}
          >
            ✓ APPLY ESTIMATES
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add Meal Dialog ────────────────────────────────────────────────────────────
function AddMealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { mutate: create, isPending } = useCreateMealEntry();
  const { toast } = useToast();
  const [showLuminous, setShowLuminous] = useState(false);

  const form = useForm<MealFormData>({
    resolver: zodResolver(mealFormSchema),
    defaultValues: { name: "", mealType: "snack", calories: 0, protein: null, carbs: null, fat: null, fiber: null, notes: "" },
  });

  const watchName = form.watch("name");
  const watchNotes = form.watch("notes");
  const watchMealType = form.watch("mealType");

  const onSubmit = (data: MealFormData) => {
    create({
      ...data,
      protein: data.protein ?? null,
      carbs: data.carbs ?? null,
      fat: data.fat ?? null,
      fiber: data.fiber ?? null,
      notes: data.notes || null,
    }, {
      onSuccess: () => {
        toast({ title: "Meal Logged", description: `${data.name} has been added to your log.` });
        onOpenChange(false);
        form.reset();
        setShowLuminous(false);
      },
      onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
    });
  };

  const activeCat = mealTypeConfig(watchMealType);

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) { form.reset(); setShowLuminous(false); } }}>
      <DialogContent
        className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto"
        style={{
          background: "rgba(4,7,18,0.98)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(99,102,241,0.15)",
        }}
      >
        <DialogHeader>
          <div className="hud-label mb-1">◈ NUTRITION LOG</div>
          <DialogTitle
            className="text-xl font-black tracking-wider uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
          >
            Log Meal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">

          {/* Meal type selector */}
          <div>
            <div className="hud-label mb-2">◈ MEAL TYPE</div>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map(mt => {
                const Icon = mt.icon;
                const isActive = watchMealType === mt.value;
                return (
                  <button
                    key={mt.value}
                    type="button"
                    onClick={() => form.setValue("mealType", mt.value as any)}
                    className="flex flex-col items-center gap-1.5 py-3 transition-all duration-200"
                    style={{
                      background: isActive ? `${mt.color}0.1)` : "rgba(6,10,26,0.7)",
                      border: `1px solid ${isActive ? `${mt.color}0.5)` : "rgba(30,35,60,0.5)"}`,
                      borderRadius: "4px",
                      boxShadow: isActive ? `0 0 10px ${mt.color}0.12)` : "none",
                      cursor: "pointer",
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: isActive ? `${mt.color}0.9)` : "rgba(100,116,139,0.5)" }} />
                    <span className="hud-label" style={{ fontSize: "0.45rem", color: isActive ? `${mt.color}0.85)` : "rgba(100,116,139,0.5)" }}>
                      {mt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="hud-label">MEAL NAME</label>
            <Input
              {...form.register("name")}
              placeholder="e.g., Chicken biryani, Protein shake..."
              data-testid="input-meal-name"
              style={inputStyle}
            />
            {form.formState.errors.name && (
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(239,68,68,0.8)" }}>
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Luminous AI analysis toggle */}
          <button
            type="button"
            onClick={() => setShowLuminous(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 transition-all"
            style={{
              background: showLuminous ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.05)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.8)",
              fontFamily: "var(--font-mono)", fontSize: "0.65rem",
              letterSpacing: "0.08em", cursor: "pointer",
            }}
          >
            <Sparkles className="w-3 h-3" />
            ANALYZE WITH LUMINOUS
            {showLuminous ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>

          <AnimatePresence>
            {showLuminous && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <LuminousPanel
                  mealName={watchName}
                  notes={watchNotes}
                  onApply={data => {
                    if (data.calories != null) form.setValue("calories", data.calories);
                    if (data.protein != null) form.setValue("protein", data.protein);
                    if (data.carbs != null) form.setValue("carbs", data.carbs);
                    if (data.fat != null) form.setValue("fat", data.fat);
                    if (data.fiber != null) form.setValue("fiber", data.fiber);
                    setShowLuminous(false);
                  }}
                  onClose={() => setShowLuminous(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calories */}
          <div className="space-y-1.5">
            <label className="hud-label" style={{ color: "rgba(245,158,11,0.75)" }}>🔥 CALORIES (kcal)</label>
            <Input
              type="number"
              {...form.register("calories", { valueAsNumber: true })}
              placeholder="e.g. 500"
              data-testid="input-meal-calories"
              style={{ ...inputStyle, borderColor: "rgba(245,158,11,0.25)" }}
            />
          </div>

          {/* Macros grid */}
          <div>
            <div className="hud-label mb-2">◇ MACROS (grams, optional)</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="hud-label" style={{ color: "rgba(99,102,241,0.65)" }}>PROTEIN (g)</label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("protein", { setValueAs: v => v === "" ? null : Number(v) })}
                  placeholder="0"
                  data-testid="input-meal-protein"
                  style={{ ...inputStyle, borderColor: "rgba(99,102,241,0.2)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="hud-label" style={{ color: "rgba(34,211,238,0.65)" }}>CARBS (g)</label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("carbs", { setValueAs: v => v === "" ? null : Number(v) })}
                  placeholder="0"
                  data-testid="input-meal-carbs"
                  style={{ ...inputStyle, borderColor: "rgba(34,211,238,0.2)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="hud-label" style={{ color: "rgba(251,191,36,0.65)" }}>FAT (g)</label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("fat", { setValueAs: v => v === "" ? null : Number(v) })}
                  placeholder="0"
                  data-testid="input-meal-fat"
                  style={{ ...inputStyle, borderColor: "rgba(251,191,36,0.2)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="hud-label" style={{ color: "rgba(74,222,128,0.65)" }}>FIBER (g)</label>
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("fiber", { setValueAs: v => v === "" ? null : Number(v) })}
                  placeholder="0"
                  data-testid="input-meal-fiber"
                  style={{ ...inputStyle, borderColor: "rgba(74,222,128,0.2)" }}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="hud-label">NOTES (optional)</label>
            <Textarea
              {...form.register("notes")}
              placeholder="e.g., extra spicy, no rice..."
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-meal"
            className="w-full py-3 font-bold tracking-widest transition-all"
            style={{
              fontFamily: "var(--font-mono)", fontSize: "0.8rem",
              background: isPending ? "rgba(99,102,241,0.08)" : `linear-gradient(135deg, ${activeCat.color}0.18), ${activeCat.color}0.08))`,
              border: `1px solid ${activeCat.color}0.45)`,
              borderRadius: "3px",
              color: `${activeCat.color}0.95)`,
              boxShadow: isPending ? "none" : `0 0 14px ${activeCat.color}0.1)`,
            }}
          >
            {isPending ? "LOGGING..." : "◈ LOG MEAL"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Meal card ─────────────────────────────────────────────────────────────────
function MealCard({ entry, onDelete }: { entry: MealEntry; onDelete: () => void }) {
  const cat = mealTypeConfig(entry.mealType);
  const Icon = cat.icon;
  const hasAnyMacro = entry.protein != null || entry.carbs != null || entry.fat != null || entry.fiber != null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-start gap-3 p-3 group"
      style={{
        background: "rgba(6,10,26,0.85)",
        border: `1px solid ${cat.color}0.2)`,
        borderLeft: `3px solid ${cat.color}0.7)`,
        borderRadius: "4px",
        transition: "border-color 0.2s",
      }}
    >
      {/* Icon */}
      <div style={{
        width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
        background: `${cat.color}0.08)`, border: `1px solid ${cat.color}0.2)`, borderRadius: "3px",
        flexShrink: 0,
      }}>
        <Icon style={{ width: 15, height: 15, color: `${cat.color}0.85)` }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.88rem", fontWeight: 600, color: "rgba(199,210,254,0.95)" }}>
            {entry.name}
          </span>
          <span className="hud-label" style={{ fontSize: "0.45rem", color: `${cat.color}0.7)` }}>
            {cat.label}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            color: "rgba(245,158,11,0.9)",
          }}>
            🔥 {entry.calories} kcal
          </span>
          {hasAnyMacro && (
            <div className="flex gap-1.5 flex-wrap">
              <MacroPill label="P" value={entry.protein} unit="g" color="rgba(99,102,241," />
              <MacroPill label="C" value={entry.carbs} unit="g" color="rgba(34,211,238," />
              <MacroPill label="F" value={entry.fat} unit="g" color="rgba(251,191,36," />
              <MacroPill label="Fi" value={entry.fiber} unit="g" color="rgba(74,222,128," />
            </div>
          )}
        </div>
        {entry.notes && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(100,116,139,0.6)", marginTop: 3 }}>
            {entry.notes}
          </p>
        )}
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(100,116,139,0.4)", marginTop: 3 }}>
          {format(new Date(entry.loggedAt), "h:mm a")}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        data-testid={`button-delete-meal-${entry.id}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5"
        style={{ background: "none", border: "none", cursor: "pointer", borderRadius: 3 }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}
      >
        <Trash2 style={{ width: 13, height: 13, color: "rgba(239,68,68,0.7)" }} />
      </button>
    </motion.div>
  );
}

// ── Day group label ────────────────────────────────────────────────────────────
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "TODAY";
  if (isYesterday(d)) return "YESTERDAY";
  return format(d, "MMM d, yyyy").toUpperCase();
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Meals() {
  const { data: entries, isLoading } = useMealEntries();
  const { mutate: deleteEntry } = useDeleteMealEntry();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("today");

  // Group entries by day
  const grouped = useMemo(() => {
    if (!entries) return [];
    const map = new Map<string, MealEntry[]>();
    for (const e of entries) {
      const key = format(new Date(e.loggedAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  // Today's totals
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayEntries = useMemo(() => {
    return (entries ?? []).filter(e => format(new Date(e.loggedAt), "yyyy-MM-dd") === todayKey);
  }, [entries, todayKey]);

  const totals = useMemo(() => ({
    calories: todayEntries.reduce((s, e) => s + e.calories, 0),
    protein: todayEntries.reduce((s, e) => s + (e.protein ?? 0), 0),
    carbs: todayEntries.reduce((s, e) => s + (e.carbs ?? 0), 0),
    fat: todayEntries.reduce((s, e) => s + (e.fat ?? 0), 0),
    fiber: todayEntries.reduce((s, e) => s + (e.fiber ?? 0), 0),
  }), [todayEntries]);

  // Meals breakdown by type for today
  const byType = useMemo(() => {
    return MEAL_TYPES.map(mt => ({
      ...mt,
      count: todayEntries.filter(e => e.mealType === mt.value).length,
      calories: todayEntries.filter(e => e.mealType === mt.value).reduce((s, e) => s + e.calories, 0),
    }));
  }, [todayEntries]);

  const handleDelete = (id: number, name: string) => {
    deleteEntry(id, {
      onSuccess: () => toast({ title: "Deleted", description: `${name} removed from log.` }),
      onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const caloriesPct = Math.min(100, (totals.calories / DAILY_GOALS.calories) * 100);
  const caloriesColor = caloriesPct > 100
    ? "rgba(239,68,68,"
    : caloriesPct > 80
    ? "rgba(251,191,36,"
    : "rgba(74,222,128,";

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <AddMealDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="hud-label mb-1">◈ NUTRITION TRACKER</div>
          <h1 className="text-3xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}>
            Meals
          </h1>
          <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: 4 }}>
            Track your nutrition. Let Luminous analyze your macros.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          data-testid="button-add-meal"
          className="flex items-center gap-2 px-4 py-3 font-bold transition-all"
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.75rem", letterSpacing: "0.08em",
            background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.35)",
            borderRadius: "3px", color: "rgba(134,239,172,0.9)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(74,222,128,0.18)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(74,222,128,0.15)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(74,222,128,0.1)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }}
        >
          <Plus className="w-4 h-4" />
          LOG MEAL
        </button>
      </motion.div>

      <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(74,222,128,0.4), rgba(74,222,128,0.1), transparent)" }} />

      {/* Today's summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="hud-label mb-3">◈ TODAY'S SUMMARY</div>
        <div style={{
          background: "rgba(6,10,26,0.8)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "4px", padding: "20px",
        }}>
          {/* Calorie bar + ring */}
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* Calorie progress */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="hud-label" style={{ color: "rgba(245,158,11,0.7)" }}>🔥 CALORIES</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: `${caloriesColor}0.9)`, fontWeight: 700 }}>
                  {totals.calories.toLocaleString()} / {DAILY_GOALS.calories.toLocaleString()} kcal
                </span>
              </div>
              <div style={{ height: 8, background: "rgba(30,40,70,0.8)", borderRadius: 4, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${caloriesPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    height: "100%", borderRadius: 4,
                    background: `linear-gradient(90deg, ${caloriesColor}0.6), ${caloriesColor}0.9))`,
                    boxShadow: `0 0 8px ${caloriesColor}0.4)`,
                  }}
                />
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(100,116,139,0.5)", marginTop: 4 }}>
                {DAILY_GOALS.calories - totals.calories > 0
                  ? `${(DAILY_GOALS.calories - totals.calories).toLocaleString()} kcal remaining`
                  : `${(totals.calories - DAILY_GOALS.calories).toLocaleString()} kcal over goal`
                }
              </div>

              {/* Macro rings */}
              <div className="flex gap-6 mt-5">
                <CircleProgress value={totals.protein} max={DAILY_GOALS.protein} color="rgba(99,102,241," label={`${Math.round(totals.protein)}g`} sub="PROTEIN" />
                <CircleProgress value={totals.carbs} max={DAILY_GOALS.carbs} color="rgba(34,211,238," label={`${Math.round(totals.carbs)}g`} sub="CARBS" />
                <CircleProgress value={totals.fat} max={DAILY_GOALS.fat} color="rgba(251,191,36," label={`${Math.round(totals.fat)}g`} sub="FAT" />
                <CircleProgress value={totals.fiber} max={DAILY_GOALS.fiber} color="rgba(74,222,128," label={`${Math.round(totals.fiber)}g`} sub="FIBER" />
              </div>
            </div>

            {/* Per-type breakdown */}
            <div style={{ minWidth: 180 }}>
              <div className="hud-label mb-3" style={{ fontSize: "0.5rem" }}>◇ BY MEAL TYPE</div>
              <div className="flex flex-col gap-2">
                {byType.map(mt => {
                  const Icon = mt.icon;
                  return (
                    <div key={mt.value} className="flex items-center gap-2">
                      <Icon style={{ width: 12, height: 12, color: `${mt.color}0.7)` }} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(100,116,139,0.7)", width: 72 }}>
                        {mt.label}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: mt.count > 0 ? `${mt.color}0.85)` : "rgba(50,60,90,0.6)", fontWeight: mt.count > 0 ? 700 : 400 }}>
                        {mt.count > 0 ? `${mt.calories} kcal` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Meal log */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="hud-label mb-3">◈ MEAL LOG</div>

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center"
            style={{ border: "1px dashed rgba(74,222,128,0.15)", borderRadius: "4px" }}>
            <Utensils className="w-10 h-10 mb-4" style={{ color: "rgba(74,222,128,0.25)" }} />
            <div className="hud-label mb-2">NO MEALS LOGGED</div>
            <p style={{ color: "rgba(100,116,139,0.6)", fontSize: "0.8rem" }}>
              Start tracking your nutrition by logging your first meal.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateKey, dayMeals]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="hud-label" style={{ color: "rgba(165,180,252,0.65)" }}>
                    {dayLabel(dayMeals[0].loggedAt.toString())}
                  </div>
                  <div className="flex-1 h-px" style={{ background: "rgba(99,102,241,0.1)" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(245,158,11,0.65)" }}>
                    {dayMeals.reduce((s, e) => s + e.calories, 0).toLocaleString()} kcal
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {dayMeals.map(entry => (
                      <MealCard
                        key={entry.id}
                        entry={entry}
                        onDelete={() => handleDelete(entry.id, entry.name)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
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
