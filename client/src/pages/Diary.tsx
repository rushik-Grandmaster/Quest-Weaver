import { useState } from "react";
import { useDiaryEntries, useCreateDiaryEntry, useUpdateDiaryEntry, useDeleteDiaryEntry } from "@/hooks/use-diary";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDiaryEntrySchema, type InsertDiaryEntry } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, BookOpen, Edit2, Feather } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const MOOD_CONFIG: Record<string, { label: string; color: string; glyph: string }> = {
  happy:   { label: "HAPPY",   color: "rgba(74,222,128,0.85)",  glyph: "◆" },
  excited: { label: "EXCITED", color: "rgba(234,179,8,0.85)",   glyph: "◈" },
  neutral: { label: "NEUTRAL", color: "rgba(148,163,184,0.75)", glyph: "◇" },
  sad:     { label: "SAD",     color: "rgba(99,102,241,0.85)",  glyph: "◉" },
  angry:   { label: "ANGRY",   color: "rgba(239,68,68,0.85)",   glyph: "▲" },
};

// Fixed ambient particle positions
const PARTICLES = [
  { left: "5%",  top: "12%", size: 1.5, dur: 5.2, delay: 0    },
  { left: "92%", top: "8%",  size: 2,   dur: 4.6, delay: 1.1  },
  { left: "80%", top: "55%", size: 1.5, dur: 6.3, delay: 0.5  },
  { left: "18%", top: "72%", size: 1,   dur: 4.9, delay: 2.0  },
  { left: "55%", top: "88%", size: 2,   dur: 5.7, delay: 0.8  },
  { left: "70%", top: "22%", size: 1.5, dur: 3.8, delay: 1.6  },
];

export default function Diary() {
  const { data: entries, isLoading } = useDiaryEntries();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const sortedEntries = entries?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto relative">

      {/* ── Ambient floating particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size + "px",
              height: p.size + "px",
              background: "rgba(129,140,248,0.55)",
              boxShadow: "0 0 5px rgba(129,140,248,0.4)",
            }}
            animate={{ y: [0, -16, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}

        {/* Slow sweep line */}
        <motion.div
          className="absolute left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)" }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8 flex items-end justify-between"
        style={{ zIndex: 1 }}
      >
        <div>
          <div className="hud-label flex items-center gap-2 mb-1">
            <Feather className="w-3 h-3" />
            SHADOW CHRONICLES / PERSONAL LOG
          </div>
          <h1
            className="text-3xl md:text-4xl font-black tracking-wider uppercase"
            style={{
              fontFamily: "var(--font-display)",
              background: "linear-gradient(135deg, #e2e8f0, #c7d2fe 40%, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 20px rgba(99,102,241,0.25))",
            }}
          >
            Mind Log
          </h1>
          <div className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.6)", fontFamily: "var(--font-mono)" }}>
            {sortedEntries.length} entr{sortedEntries.length === 1 ? "y" : "ies"} archived
          </div>
        </div>

        <CreateDiaryDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </motion.div>

      {/* ── Entry Feed ── */}
      <div className="relative space-y-4" style={{ zIndex: 1 }}>
        {sortedEntries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="py-20 text-center relative overflow-hidden rounded"
            style={{
              background: "rgba(6,10,26,0.7)",
              border: "1px dashed rgba(99,102,241,0.25)",
            }}
          >
            <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.5)" }} />
            <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.5)" }} />

            {/* Pulsing icon */}
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(99,102,241,0.6)" }} />
            </motion.div>

            <div className="hud-label mb-2">◈ NO ENTRIES YET</div>
            <p className="text-sm mb-5" style={{ color: "rgba(148,163,184,0.7)", fontFamily: "var(--font-mono)" }}>
              Begin recording your journey, Hunter.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              data-testid="button-empty-new-entry"
              className="px-5 py-2 text-xs uppercase tracking-widest transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)",
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.35)",
                borderRadius: "3px",
                color: "rgba(165,180,252,0.9)",
              }}
            >
              + Write First Entry
            </button>
          </motion.div>
        ) : (
          <AnimatePresence>
            {sortedEntries.map((entry, index) => {
              const mood = MOOD_CONFIG[entry.mood] ?? MOOD_CONFIG.neutral;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  data-testid={`card-diary-${entry.id}`}
                  className="relative group overflow-hidden"
                  style={{
                    background: "rgba(6,10,26,0.85)",
                    border: "1px solid rgba(99,102,241,0.18)",
                    borderRadius: "4px",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {/* Corner brackets */}
                  <div className="absolute -top-px -left-px w-3 h-3 border-t border-l transition-all duration-300 group-hover:w-4 group-hover:h-4" style={{ borderColor: `${mood.color}` }} />
                  <div className="absolute -bottom-px -right-px w-3 h-3 border-b border-r transition-all duration-300 group-hover:w-4 group-hover:h-4" style={{ borderColor: "rgba(99,102,241,0.5)" }} />

                  {/* Hover glow */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 60%)" }}
                  />

                  {/* Left mood accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ background: `linear-gradient(180deg, ${mood.color}, transparent)` }}
                  />

                  <div className="p-5 pl-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Mood badge */}
                        <div
                          className="px-2 py-0.5 flex items-center gap-1.5 rounded-sm"
                          style={{
                            background: `${mood.color}14`,
                            border: `1px solid ${mood.color}40`,
                          }}
                        >
                          <span style={{ color: mood.color, fontSize: "0.6rem" }}>{mood.glyph}</span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.62rem",
                              letterSpacing: "0.1em",
                              color: mood.color,
                            }}
                          >
                            {mood.label}
                          </span>
                        </div>

                        {/* Timestamp */}
                        <span
                          className="text-xs"
                          style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.7)", fontSize: "0.65rem" }}
                        >
                          {format(new Date(entry.createdAt), "MMM d, yyyy · HH:mm")}
                        </span>
                      </div>

                      {/* Action buttons — appear on hover */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <EditEntryDialog entryId={entry.id} currentContent={entry.content} currentMood={entry.mood} />
                        <DeleteButton entryId={entry.id} />
                      </div>
                    </div>

                    {/* Content */}
                    <p
                      className="leading-relaxed whitespace-pre-wrap"
                      style={{ color: "rgba(199,210,254,0.85)", fontSize: "0.9rem" }}
                    >
                      {entry.content}
                    </p>

                    {/* Edited note */}
                    {entry.updatedAt !== entry.createdAt && (
                      <p
                        className="text-xs mt-3"
                        style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.5)", fontSize: "0.6rem" }}
                      >
                        ◇ edited {format(new Date(entry.updatedAt), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ════════ DIALOGS ════════

function CreateDiaryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createEntry, isPending } = useCreateDiaryEntry();
  const { toast } = useToast();
  const form = useForm<InsertDiaryEntry>({
    resolver: zodResolver(insertDiaryEntrySchema),
    defaultValues: { content: "", mood: "neutral" },
  });

  const onSubmit = (data: InsertDiaryEntry) => {
    createEntry(data, {
      onSuccess: () => {
        toast({ title: "Entry saved!", description: "Your diary entry has been added." });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({ title: "Failed to save entry", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button
          data-testid="button-new-entry"
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            background: "linear-gradient(135deg, rgba(99,102,241,0.85), rgba(79,70,229,0.8))",
            border: "1px solid rgba(129,140,248,0.4)",
            borderRadius: "3px",
            color: "white",
            boxShadow: "0 0 20px rgba(99,102,241,0.25)",
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Entry
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a new diary entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">How are you feeling?</label>
            <Select defaultValue="neutral" onValueChange={(value) => form.setValue("mood", value as any)}>
              <SelectTrigger data-testid="select-mood">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="excited">Excited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Your thoughts</label>
            <Textarea
              {...form.register("content")}
              placeholder="What's on your mind today?"
              className="min-h-[200px]"
              data-testid="textarea-content"
            />
            {form.formState.errors.content && (
              <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-entry">
            {isPending ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({ entryId, currentContent, currentMood }: {
  entryId: number; currentContent: string; currentMood: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: updateEntry, isPending } = useUpdateDiaryEntry();
  const { toast } = useToast();
  const form = useForm<Partial<InsertDiaryEntry>>({
    defaultValues: { content: currentContent, mood: currentMood as any },
  });

  const onSubmit = (data: Partial<InsertDiaryEntry>) => {
    updateEntry({ id: entryId, data }, {
      onSuccess: () => {
        toast({ title: "Entry updated!" });
        setIsOpen(false);
      },
      onError: (error: any) => {
        toast({ title: "Failed to update entry", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-edit-${entryId}`}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit diary entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mood</label>
            <Select defaultValue={currentMood} onValueChange={(value) => form.setValue("mood", value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="excited">Excited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea {...form.register("content")} className="min-h-[200px]" />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Updating..." : "Update Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ entryId }: { entryId: number }) {
  const { mutate: deleteEntry, isPending } = useDeleteDiaryEntry();
  const { toast } = useToast();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        deleteEntry(entryId, {
          onSuccess: () => toast({ title: "Entry deleted" }),
          onError: (error: any) => toast({ title: "Failed to delete entry", description: error.message, variant: "destructive" }),
        });
      }}
      disabled={isPending}
      data-testid={`button-delete-${entryId}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
