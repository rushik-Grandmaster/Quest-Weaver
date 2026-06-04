import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Camera, Upload, Loader2, Scale, Ruler, Percent, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const bodyFatSchema = z.object({
  height: z.coerce.number().min(50).max(300),
  weight: z.coerce.number().min(20).max(500),
  image: z.string().min(1, "Photo is required"),
});

type BodyFatFormData = z.infer<typeof bodyFatSchema>;

// Fixed particle positions
const PARTICLES = [
  { left: "7%",  top: "15%", size: 2,   dur: 5.2, delay: 0    },
  { left: "88%", top: "10%", size: 1.5, dur: 4.8, delay: 1.0  },
  { left: "75%", top: "60%", size: 2,   dur: 6.1, delay: 0.5  },
  { left: "20%", top: "75%", size: 1.5, dur: 4.4, delay: 1.8  },
  { left: "50%", top: "85%", size: 1,   dur: 5.7, delay: 0.9  },
  { left: "93%", top: "45%", size: 1.5, dur: 3.9, delay: 2.2  },
];

export default function BodyFatAnalysis() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ bodyFat: number; analysis: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<BodyFatFormData>({
    resolver: zodResolver(bodyFatSchema),
    defaultValues: { height: 170, weight: 70, image: "" },
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        form.setValue("image", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const onSubmit = async (data: BodyFatFormData) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/ai/body-fat", data);
      const json = await res.json();
      setResult(json);
      toast({ title: "Analysis Complete", description: `Estimated Body Fat: ${json.bodyFat}%` });
    } catch {
      toast({ title: "Analysis Failed", description: "Please try again with a clearer photo.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 relative">

      {/* ── Ambient particles ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left, top: p.top,
              width: p.size + "px", height: p.size + "px",
              background: "rgba(129,140,248,0.55)",
              boxShadow: "0 0 5px rgba(129,140,248,0.4)",
            }}
            animate={{ y: [0, -14, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
        <motion.div
          className="absolute left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.12), transparent)" }}
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* ── HUD Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div className="hud-label flex items-center gap-2 mb-2">
          <Activity className="w-3 h-3" />
          SYSTEM SCAN / BODY COMPOSITION
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
          AI Body Scan
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.6)", fontFamily: "var(--font-mono)" }}>
          Upload a clear full-body photo for an AI-powered composition analysis.
        </p>
      </motion.div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative" style={{ zIndex: 1 }}>

        {/* ── Measurement Form card ── */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden"
          style={{
            background: "rgba(6,10,26,0.92)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "6px",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Corner brackets */}
          <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
          <div className="absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
          <div className="absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.4)" }} />
          <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.4)" }} />

          {/* Breathing glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ boxShadow: ["inset 0 0 0px rgba(99,102,241,0)", "inset 0 0 30px rgba(99,102,241,0.06)", "inset 0 0 0px rgba(99,102,241,0)"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Animated scan line inside card */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.25), transparent)" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative z-10 p-6">
            <div className="hud-label mb-4">◈ INPUT PARAMETERS</div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="hud-label flex items-center gap-1.5">
                          <Ruler className="w-3 h-3" /> HEIGHT (cm)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="font-mono"
                            style={{
                              background: "rgba(15,23,42,0.6)",
                              border: "1px solid rgba(99,102,241,0.25)",
                              color: "rgba(199,210,254,0.95)",
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="hud-label flex items-center gap-1.5">
                          <Scale className="w-3 h-3" /> WEIGHT (kg)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="font-mono"
                            style={{
                              background: "rgba(15,23,42,0.6)",
                              border: "1px solid rgba(99,102,241,0.25)",
                              color: "rgba(199,210,254,0.95)",
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Photo upload area */}
                <div className="space-y-3">
                  <div className="hud-label flex items-center gap-1.5">
                    <Camera className="w-3 h-3" /> PROGRESS PHOTO
                  </div>

                  <div
                    className="relative overflow-hidden group"
                    style={{
                      aspectRatio: "3/4",
                      border: "1px dashed rgba(99,102,241,0.35)",
                      borderRadius: "4px",
                      background: "rgba(15,23,42,0.4)",
                    }}
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                        <div
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(4,7,18,0.7)" }}
                        >
                          <button
                            type="button"
                            onClick={() => { setImagePreview(null); form.setValue("image", ""); }}
                            className="px-4 py-1.5 text-xs uppercase tracking-widest"
                            style={{
                              fontFamily: "var(--font-mono)",
                              background: "rgba(99,102,241,0.2)",
                              border: "1px solid rgba(99,102,241,0.5)",
                              borderRadius: "3px",
                              color: "rgba(165,180,252,0.95)",
                            }}
                          >
                            Change Photo
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                        {/* Pulsing upload icon */}
                        <motion.div
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Upload className="w-10 h-10" style={{ color: "rgba(99,102,241,0.6)" }} />
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium mb-0.5" style={{ color: "rgba(165,180,252,0.9)", fontFamily: "var(--font-mono)" }}>
                            Upload or Capture
                          </p>
                          <p className="text-xs" style={{ color: "rgba(100,116,139,0.7)" }}>Front view · standing straight</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={triggerUpload}
                            className="px-3 py-1.5 text-xs uppercase tracking-widest transition-all"
                            style={{
                              fontFamily: "var(--font-mono)",
                              background: "rgba(99,102,241,0.1)",
                              border: "1px solid rgba(99,102,241,0.3)",
                              borderRadius: "3px",
                              color: "rgba(165,180,252,0.85)",
                            }}
                          >
                            <Upload className="w-3 h-3 inline mr-1" /> Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (fileInputRef.current) {
                                fileInputRef.current.setAttribute("capture", "environment");
                                fileInputRef.current.click();
                              }
                            }}
                            className="px-3 py-1.5 text-xs uppercase tracking-widest transition-all"
                            style={{
                              fontFamily: "var(--font-mono)",
                              background: "rgba(99,102,241,0.1)",
                              border: "1px solid rgba(99,102,241,0.3)",
                              borderRadius: "3px",
                              color: "rgba(165,180,252,0.85)",
                            }}
                          >
                            <Camera className="w-3 h-3 inline mr-1" /> Camera
                          </button>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handleImageUpload(e);
                            if (fileInputRef.current) fileInputRef.current.removeAttribute("capture");
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {form.formState.errors.image && (
                    <p className="text-xs" style={{ color: "rgba(248,113,113,0.9)", fontFamily: "var(--font-mono)" }}>
                      {form.formState.errors.image.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: isAnalyzing
                      ? "rgba(99,102,241,0.3)"
                      : "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(79,70,229,0.85))",
                    border: "1px solid rgba(129,140,248,0.4)",
                    borderRadius: "3px",
                    color: "white",
                    boxShadow: isAnalyzing ? "none" : "0 0 24px rgba(99,102,241,0.35)",
                    cursor: isAnalyzing ? "not-allowed" : "pointer",
                  }}
                  whileTap={isAnalyzing ? {} : { scale: 0.98 }}
                >
                  {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> SCANNING COMPOSITION...</>
                  ) : (
                    <>▸ RUN BODY SCAN</>
                  )}
                </motion.button>
              </form>
            </Form>
          </div>
        </motion.div>

        {/* ── Results panel ── */}
        <AnimatePresence>
          {result ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              {/* Main result card */}
              <div
                className="relative overflow-hidden"
                style={{
                  background: "rgba(6,10,26,0.92)",
                  border: "1px solid rgba(129,140,248,0.35)",
                  borderRadius: "6px",
                  boxShadow: "0 0 40px rgba(99,102,241,0.15)",
                }}
              >
                <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(129,140,248,0.9)" }} />
                <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(129,140,248,0.6)" }} />

                {/* Radial glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(99,102,241,0.1) 0%, transparent 60%)" }} />

                {/* Big % watermark */}
                <Percent className="absolute top-4 right-4 w-20 h-20 pointer-events-none" style={{ color: "rgba(99,102,241,0.07)" }} />

                <div className="relative z-10 p-6">
                  <div className="hud-label mb-3">◈ SCAN RESULT</div>

                  {/* Big number */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="text-7xl font-black mb-4"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "linear-gradient(135deg, rgba(165,180,252,1), rgba(99,102,241,1))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 0 20px rgba(99,102,241,0.5))",
                    }}
                  >
                    {result.bodyFat}%
                  </motion.div>

                  {/* Analysis text */}
                  <div
                    className="p-4 rounded"
                    style={{
                      background: "rgba(15,23,42,0.6)",
                      border: "1px solid rgba(99,102,241,0.15)",
                    }}
                  >
                    <p className="text-sm leading-relaxed italic" style={{ color: "rgba(199,210,254,0.8)" }}>
                      "{result.analysis}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Metric tiles */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "BMI INDEX",
                    value: (form.getValues("weight") / Math.pow(form.getValues("height") / 100, 2)).toFixed(1),
                    color: "rgba(99,102,241,0.85)",
                  },
                  {
                    label: "DIRECTIVE",
                    value: "Keep Pushing",
                    color: "rgba(74,222,128,0.85)",
                  },
                ].map((tile) => (
                  <motion.div
                    key={tile.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative overflow-hidden p-4"
                    style={{
                      background: "rgba(6,10,26,0.88)",
                      border: `1px solid ${tile.color}30`,
                      borderRadius: "4px",
                    }}
                  >
                    <div className="absolute -top-px -left-px w-2 h-2 border-t border-l" style={{ borderColor: tile.color }} />

                    {/* Breathing glow */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      animate={{ opacity: [0, 0.05, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      style={{ background: `radial-gradient(ellipse at center, ${tile.color} 0%, transparent 70%)` }}
                    />

                    <div className="hud-label relative z-10">{tile.label}</div>
                    <div
                      className="text-xl font-bold mt-1 relative z-10"
                      style={{ fontFamily: "var(--font-mono)", color: tile.color }}
                    >
                      {tile.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Placeholder when no result */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden flex flex-col items-center justify-center"
              style={{
                background: "rgba(6,10,26,0.6)",
                border: "1px dashed rgba(99,102,241,0.2)",
                borderRadius: "6px",
                minHeight: "340px",
              }}
            >
              <div className="absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.4)" }} />
              <div className="absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.4)" }} />

              <motion.div
                animate={{ opacity: [0.25, 0.7, 0.25] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Percent className="w-14 h-14 mb-3" style={{ color: "rgba(99,102,241,0.5)" }} />
              </motion.div>
              <div className="hud-label text-center">◈ AWAITING INPUT</div>
              <p className="text-xs mt-2 text-center" style={{ color: "rgba(100,116,139,0.6)", fontFamily: "var(--font-mono)" }}>
                Submit measurements and photo<br />to begin the scan
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
