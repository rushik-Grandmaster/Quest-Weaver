import { useState, useRef, useEffect } from "react";
import { useSchedule, useCreateScheduleItem, useDeleteScheduleItem } from "@/hooks/use-schedule";
import { format, addDays, startOfWeek, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScheduleItemSchema, type InsertScheduleItem, type ScheduleItem } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUpBlur, fadeTransition } from "@/lib/animations";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Calendar, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── constants ───────────────────────────────────────────── */
const GRID_START = 6;   // 6 AM
const GRID_END   = 24;  // midnight
const GRID_HOURS = GRID_END - GRID_START;
const HOUR_PX    = 72;  // pixels per hour
const TOTAL_H    = GRID_HOURS * HOUR_PX;

const COLORS = [
  { bg: "rgba(99,102,241,0.18)", border: "rgba(99,102,241,0.55)", text: "rgba(165,180,252,0.95)", glow: "rgba(99,102,241,0.2)" },
  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.5)",  text: "rgba(134,239,172,0.95)", glow: "rgba(34,197,94,0.15)" },
  { bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.45)", text: "rgba(253,224,71,0.95)",  glow: "rgba(234,179,8,0.15)" },
  { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.5)", text: "rgba(253,186,116,0.95)", glow: "rgba(249,115,22,0.15)" },
  { bg: "rgba(168,85,247,0.14)", border: "rgba(168,85,247,0.5)", text: "rgba(216,180,254,0.95)", glow: "rgba(168,85,247,0.18)" },
];

/* ─── helpers ─────────────────────────────────────────────── */
function minutesSinceGridStart(date: Date): number {
  return (date.getHours() - GRID_START) * 60 + date.getMinutes();
}

function topPx(date: Date): number {
  return Math.max(0, (minutesSinceGridStart(date) / 60) * HOUR_PX);
}

function heightPx(start: Date, end: Date): number {
  const mins = (end.getTime() - start.getTime()) / 60000;
  return Math.max(24, (mins / 60) * HOUR_PX);
}

function toLocalDatetimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Simple overlap layout: returns array of [columnIndex, totalColumns] per event */
function layoutColumns(events: ScheduleItem[]): Map<number, { col: number; total: number }> {
  const sorted = [...events].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const result = new Map<number, { col: number; total: number }>();
  const groups: ScheduleItem[][] = [];

  for (const ev of sorted) {
    const start = new Date(ev.startTime).getTime();
    const end   = new Date(ev.endTime).getTime();
    let placed = false;
    for (const group of groups) {
      const lastEnd = Math.max(...group.map(g => new Date(g.endTime).getTime()));
      if (start < lastEnd) { group.push(ev); placed = true; break; }
    }
    if (!placed) groups.push([ev]);
  }

  for (const group of groups) {
    const total = group.length;
    group.forEach((ev, i) => result.set(ev.id, { col: i, total }));
  }
  return result;
}

function getCurrentTimePx(): number {
  const now = new Date();
  const mins = (now.getHours() - GRID_START) * 60 + now.getMinutes();
  return (mins / 60) * HOUR_PX;
}

/* ─── corner bracket ──────────────────────────────────────── */
function Brackets({ color = "rgba(99,102,241,0.5)" }: { color?: string }) {
  const s: React.CSSProperties = { borderColor: color };
  return (
    <>
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={s} />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={s} />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={s} />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={s} />
    </>
  );
}

/* ─── add event dialog ────────────────────────────────────── */
function AddEventDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: Date;
}) {
  const { mutate: create, isPending } = useCreateScheduleItem();
  const { toast } = useToast();

  const defaultStart = new Date(defaultDate);
  defaultStart.setHours(9, 0, 0, 0);
  const defaultEnd = new Date(defaultDate);
  defaultEnd.setHours(10, 0, 0, 0);

  const form = useForm<InsertScheduleItem>({
    resolver: zodResolver(insertScheduleItemSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: defaultStart,
      endTime: defaultEnd,
    },
  });

  // Reset defaults when date changes
  useEffect(() => {
    if (!open) return;
    const s = new Date(defaultDate); s.setHours(9, 0, 0, 0);
    const e = new Date(defaultDate); e.setHours(10, 0, 0, 0);
    form.reset({ title: "", description: "", startTime: s, endTime: e });
  }, [open, defaultDate]);

  const onSubmit = (data: InsertScheduleItem) => {
    create(
      { ...data, startTime: new Date(data.startTime), endTime: new Date(data.endTime) },
      {
        onSuccess: () => {
          toast({ title: "◈ EVENT SCHEDULED", description: "Added to your planner." });
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast({ title: "Failed", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={() => onOpenChange(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md p-6 space-y-5"
        style={{
          background: "rgba(6,10,26,0.98)",
          border: "1px solid rgba(99,102,241,0.35)",
          borderRadius: "4px",
          boxShadow: "0 0 60px rgba(99,102,241,0.1)",
        }}
      >
        <Brackets />

        <div className="flex items-center justify-between">
          <div>
            <div className="hud-label mb-1">◈ SCHEDULE EVENT</div>
            <div style={{ color: "rgba(165,180,252,0.9)", fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
              {format(defaultDate, "EEEE, MMM d")}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center transition-all duration-200"
            style={{ border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px", color: "rgba(100,116,139,0.7)", background: "rgba(10,14,30,0.7)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <div className="hud-label mb-1.5">EVENT TITLE</div>
            <input
              {...form.register("title")}
              placeholder="Enter event title..."
              data-testid="input-event-title"
              className="w-full px-3 py-2.5 outline-none transition-all duration-200"
              style={{
                background: "rgba(10,14,30,0.8)",
                border: `1px solid ${form.formState.errors.title ? "rgba(239,68,68,0.5)" : "rgba(30,35,60,0.7)"}`,
                borderRadius: "3px",
                color: "rgba(199,210,254,0.9)",
                fontSize: "0.88rem",
                fontFamily: "var(--font-mono)",
              }}
            />
            {form.formState.errors.title && (
              <p style={{ color: "rgba(248,113,113,0.7)", fontSize: "0.7rem", marginTop: "4px" }}>
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="hud-label mb-1.5">DESCRIPTION (OPTIONAL)</div>
            <textarea
              {...form.register("description")}
              placeholder="Add details..."
              rows={2}
              data-testid="input-event-description"
              className="w-full px-3 py-2.5 outline-none resize-none transition-all duration-200"
              style={{
                background: "rgba(10,14,30,0.8)",
                border: "1px solid rgba(30,35,60,0.7)",
                borderRadius: "3px",
                color: "rgba(199,210,254,0.9)",
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "START TIME", field: "startTime" as const },
              { label: "END TIME",   field: "endTime"   as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <div className="hud-label mb-1.5">{label}</div>
                <input
                  type="datetime-local"
                  defaultValue={toLocalDatetimeValue(field === "startTime" ? defaultStart : defaultEnd)}
                  data-testid={`input-${field}`}
                  {...form.register(field, { valueAsDate: true })}
                  className="w-full px-3 py-2.5 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(10,14,30,0.8)",
                    border: `1px solid ${form.formState.errors[field] ? "rgba(239,68,68,0.5)" : "rgba(30,35,60,0.7)"}`,
                    borderRadius: "3px",
                    color: "rgba(165,180,252,0.85)",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-mono)",
                    colorScheme: "dark",
                  }}
                />
                {form.formState.errors[field] && (
                  <p style={{ color: "rgba(248,113,113,0.7)", fontSize: "0.68rem", marginTop: "3px" }}>
                    {form.formState.errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-event"
            className="w-full flex items-center justify-center gap-2 py-3 font-black tracking-widest uppercase transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              background: isPending ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.18)",
              border: "1px solid rgba(99,102,241,0.5)",
              borderRadius: "3px",
              color: isPending ? "rgba(99,102,241,0.4)" : "rgba(165,180,252,0.95)",
            }}
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> SCHEDULING...</> : <><Plus className="w-4 h-4" /> ADD EVENT</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────────── */
export default function Schedule() {
  const { data: allItems = [], isLoading } = useSchedule();
  const { mutate: deleteItem } = useDeleteScheduleItem();
  const { toast } = useToast();
  const gridRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart]       = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [nowPx, setNowPx]               = useState(getCurrentTimePx());

  // Update current time line every minute
  useEffect(() => {
    const id = setInterval(() => setNowPx(getCurrentTimePx()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (gridRef.current && isToday(selectedDate)) {
      const scrollTarget = Math.max(0, nowPx - 120);
      gridRef.current.scrollTop = scrollTarget;
    } else if (gridRef.current) {
      gridRef.current.scrollTop = 3 * HOUR_PX; // scroll to 9 AM area
    }
  }, [selectedDate]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter items for selected day
  const dayItems = (allItems as ScheduleItem[]).filter((item) =>
    isSameDay(new Date(item.startTime), selectedDate),
  ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const layout = layoutColumns(dayItems);

  // Items with dots for week strip
  const itemDates = (allItems as ScheduleItem[]).map(i => new Date(i.startTime));

  const handleDelete = (id: number) => {
    if (deleteConfirm === id) {
      deleteItem(id);
      setDeleteConfirm(null);
      toast({ title: "Event removed" });
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 2500);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "rgba(4,7,18,0.98)" }}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3 space-y-4">
        <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={fadeTransition}
          className="flex items-center justify-between">
          <div>
            <div className="hud-label mb-1">◈ DAILY PLANNER</div>
            <h1 className="text-2xl font-black tracking-widest uppercase"
              style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}>
              {format(selectedDate, "EEEE, MMMM d")}
            </h1>
          </div>
          <button
            data-testid="button-add-event"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 font-black tracking-widest uppercase transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.45)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.95)",
              boxShadow: "0 0 16px rgba(99,102,241,0.1)",
            }}
          >
            <Plus className="w-4 h-4" /> ADD EVENT
          </button>
        </motion.div>

        {/* Week strip */}
        <motion.div variants={fadeUpBlur} initial="hidden" animate="visible"
          transition={{ ...fadeTransition, delay: 0.08 }}
          className="relative p-3"
          style={{ background: "rgba(6,10,26,0.9)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "4px" }}
        >
          {/* Week nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              data-testid="button-prev-week"
              onClick={() => setWeekStart(w => subWeeks(w, 1))}
              className="w-7 h-7 flex items-center justify-center transition-all duration-200"
              style={{ background: "rgba(10,14,30,0.8)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px", color: "rgba(148,163,184,0.7)" }}
            ><ChevronLeft className="w-4 h-4" /></button>

            <div className="flex items-center gap-3">
              <span className="hud-label" style={{ color: "rgba(100,116,139,0.6)", fontSize: "0.6rem" }}>
                {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </span>
              {!isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) && (
                <button
                  onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDate(new Date()); }}
                  className="px-2 py-0.5 hud-label transition-all duration-200"
                  style={{
                    fontSize: "0.55rem",
                    background: "rgba(99,102,241,0.1)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "2px",
                    color: "rgba(129,140,248,0.7)",
                    cursor: "pointer",
                  }}
                >
                  TODAY
                </button>
              )}
            </div>

            <button
              data-testid="button-next-week"
              onClick={() => setWeekStart(w => addWeeks(w, 1))}
              className="w-7 h-7 flex items-center justify-center transition-all duration-200"
              style={{ background: "rgba(10,14,30,0.8)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px", color: "rgba(148,163,184,0.7)" }}
            ><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Day columns */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const sel    = isSameDay(day, selectedDate);
              const today  = isToday(day);
              const hasEv  = itemDates.some(d => isSameDay(d, day));
              return (
                <button
                  key={day.toISOString()}
                  data-testid={`day-${format(day, "yyyy-MM-dd")}`}
                  onClick={() => setSelectedDate(day)}
                  className="flex flex-col items-center py-2.5 gap-1 transition-all duration-200"
                  style={{
                    borderRadius: "3px",
                    background: sel ? "rgba(99,102,241,0.18)" : today ? "rgba(99,102,241,0.06)" : "transparent",
                    border: sel
                      ? "1px solid rgba(99,102,241,0.5)"
                      : today
                      ? "1px solid rgba(99,102,241,0.2)"
                      : "1px solid transparent",
                  }}
                >
                  <span
                    className="hud-label"
                    style={{
                      fontSize: "0.55rem",
                      color: sel ? "rgba(129,140,248,0.8)" : "rgba(100,116,139,0.5)",
                    }}
                  >
                    {format(day, "EEE").toUpperCase()}
                  </span>
                  <span
                    className="font-black tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "1rem",
                      lineHeight: 1,
                      color: sel
                        ? "rgba(165,180,252,0.95)"
                        : today
                        ? "rgba(199,210,254,0.75)"
                        : "rgba(148,163,184,0.6)",
                    }}
                  >
                    {format(day, "d")}
                  </span>
                  {/* Event dot */}
                  <div
                    className="w-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: hasEv ? (sel ? "rgba(165,180,252,0.9)" : "rgba(99,102,241,0.5)") : "transparent" }}
                  />
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── Time Grid ──────────────────────────────────── */}
      <div
        ref={gridRef}
        className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-app"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.5)" }} />
          </div>
        ) : (
          <div
            className="relative"
            style={{ height: `${TOTAL_H + 32}px` }}
          >
            {/* Hour rows */}
            {Array.from({ length: GRID_HOURS + 1 }, (_, i) => {
              const hour = GRID_START + i;
              const y    = i * HOUR_PX;
              const label = hour >= 24 ? null : format(new Date().setHours(hour, 0, 0, 0), "h a");
              const isMajor = hour % 3 === 0;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start"
                  style={{ top: `${y}px` }}
                >
                  {/* Hour label */}
                  <div
                    className="flex-shrink-0 w-14 text-right pr-3 -mt-2.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.65rem",
                      color: isMajor ? "rgba(100,116,139,0.65)" : "rgba(100,116,139,0.3)",
                      userSelect: "none",
                    }}
                  >
                    {label}
                  </div>
                  {/* Grid line */}
                  <div
                    className="flex-1"
                    style={{
                      height: "1px",
                      background: isMajor
                        ? "rgba(30,35,60,0.75)"
                        : "rgba(30,35,60,0.35)",
                    }}
                  />
                </div>
              );
            })}

            {/* Half-hour ticks */}
            {Array.from({ length: GRID_HOURS }, (_, i) => (
              <div
                key={`half-${i}`}
                className="absolute right-0 flex items-start"
                style={{ top: `${i * HOUR_PX + HOUR_PX / 2}px`, left: "56px" }}
              >
                <div style={{ width: "40px", height: "1px", background: "rgba(30,35,60,0.2)" }} />
              </div>
            ))}

            {/* Current time line */}
            {isToday(selectedDate) && nowPx >= 0 && nowPx <= TOTAL_H && (
              <div
                className="absolute z-20 flex items-center"
                style={{ top: `${nowPx}px`, left: "56px", right: 0 }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "rgba(239,68,68,0.9)", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />
                <div className="flex-1 h-px" style={{ background: "rgba(239,68,68,0.6)", boxShadow: "0 0 6px rgba(239,68,68,0.3)" }} />
                <span
                  className="flex-shrink-0 ml-1 hud-label"
                  style={{ color: "rgba(248,113,113,0.7)", fontSize: "0.55rem" }}
                >
                  {format(new Date(), "h:mm a")}
                </span>
              </div>
            )}

            {/* Events */}
            <AnimatePresence>
              {dayItems.map((item, idx) => {
                const start   = new Date(item.startTime);
                const end     = new Date(item.endTime);
                const top     = topPx(start);
                const height  = heightPx(start, end);
                const { col, total } = layout.get(item.id) ?? { col: 0, total: 1 };
                const color   = COLORS[idx % COLORS.length];
                const colW    = (100 - 2) / total;
                const leftPct = col * colW + 1;
                const isDeleting = deleteConfirm === item.id;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20 }}
                    transition={{ duration: 0.25 }}
                    data-testid={`event-${item.id}`}
                    className="absolute group"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(56px + ${leftPct}%)`,
                      width: `calc(${colW}% - 4px)`,
                      background: color.bg,
                      border: `1px solid ${isDeleting ? "rgba(239,68,68,0.55)" : color.border}`,
                      borderRadius: "3px",
                      padding: "6px 8px",
                      overflow: "hidden",
                      boxShadow: `0 0 12px ${color.glow}`,
                      zIndex: 10,
                      cursor: "default",
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5"
                      style={{ background: color.border }}
                    />

                    <div className="pl-1">
                      <div
                        className="font-bold truncate leading-tight"
                        style={{ color: color.text, fontSize: height > 40 ? "0.8rem" : "0.7rem" }}
                      >
                        {item.title}
                      </div>

                      {height > 36 && (
                        <div
                          className="flex items-center gap-1 mt-0.5"
                          style={{ color: color.text, opacity: 0.65, fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {format(start, "h:mm")}–{format(end, "h:mm a")}
                        </div>
                      )}

                      {height > 60 && item.description && (
                        <div
                          className="mt-1 text-xs leading-tight line-clamp-2"
                          style={{ color: color.text, opacity: 0.55, fontSize: "0.7rem" }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      data-testid={`button-delete-event-${item.id}`}
                      onClick={() => handleDelete(item.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                      style={{
                        background: isDeleting ? "rgba(239,68,68,0.2)" : "rgba(4,7,18,0.7)",
                        border: `1px solid ${isDeleting ? "rgba(239,68,68,0.5)" : "rgba(30,35,60,0.6)"}`,
                        borderRadius: "3px",
                        color: isDeleting ? "rgba(248,113,113,0.9)" : "rgba(148,163,184,0.6)",
                      }}
                    >
                      {isDeleting ? <X className="w-3 h-3" /> : <Trash2 className="w-3 h-3" />}
                    </button>

                    {isDeleting && (
                      <div
                        className="absolute bottom-1.5 right-1.5 hud-label"
                        style={{ color: "rgba(248,113,113,0.7)", fontSize: "0.5rem" }}
                      >
                        CLICK AGAIN TO DELETE
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty state */}
            {dayItems.length === 0 && !isLoading && (
              <div
                className="absolute flex flex-col items-center justify-center gap-3 text-center"
                style={{ left: "72px", right: 0, top: "120px" }}
              >
                <div
                  className="w-14 h-14 flex items-center justify-center"
                  style={{
                    background: "rgba(99,102,241,0.05)",
                    border: "1px solid rgba(99,102,241,0.15)",
                    borderRadius: "4px",
                  }}
                >
                  <Calendar className="w-7 h-7" style={{ color: "rgba(99,102,241,0.25)" }} />
                </div>
                <div>
                  <div className="hud-label mb-1">NO EVENTS SCHEDULED</div>
                  <p style={{ color: "rgba(100,116,139,0.45)", fontSize: "0.75rem" }}>
                    Press ADD EVENT to schedule your day
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <AddEventDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            defaultDate={selectedDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
