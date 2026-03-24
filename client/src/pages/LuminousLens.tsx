import { useState, useRef, useCallback } from "react";
import { Camera, Upload, Loader2, Scan, Eye, X, RefreshCw, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUpBlur, fadeTransition, staggerContainer, staggerChild } from "@/lib/animations";

/** Compress image to max 900px and JPEG 82% — keeps quality while drastically reducing payload size */
async function compressImage(dataUrl: string, maxDim = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));

      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px z-10 pointer-events-none"
      style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(129,140,248,0.9), rgba(99,102,241,0.7), transparent)" }}
      animate={{ top: ["10%", "90%", "10%"] }}
      transition={{ duration: 3.5, ease: "linear", repeat: Infinity }}
    />
  );
}

function CornerBrackets({ color = "rgba(99,102,241,0.7)" }: { color?: string }) {
  const s: React.CSSProperties = { borderColor: color };
  return (
    <>
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2" style={s} />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2" style={s} />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2" style={s} />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2" style={s} />
    </>
  );
}

export default function LuminousLens() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const raw = reader.result as string;
      try {
        const compressed = await compressImage(raw);
        setImagePreview(compressed);
        setAnalysis(null);
        setError(null);
      } catch {
        setImagePreview(raw);
        setAnalysis(null);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.removeAttribute("capture");
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview || isAnalyzing) return;
    setIsAnalyzing(true);
    setScanning(true);
    setError(null);
    setAnalysis(null);

    try {
      const res = await apiRequest("POST", "/api/ai/lens", { image: imagePreview });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server error ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      const msg = err.message || "Analysis failed. Please try again.";
      setError(msg);
      toast({ title: "Scan Failed", description: msg, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      setScanning(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={fadeTransition}>
        <div className="hud-label mb-1">◈ VISUAL INTELLIGENCE MODULE</div>
        <h1
          className="text-3xl font-black tracking-widest uppercase"
          style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
        >
          Luminous Lens
        </h1>
        <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: "4px" }}>
          Point Luminous at anything — objects, text, food, documents — and get an instant scan.
        </p>
      </motion.div>

      <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1), transparent)" }} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Upload panel ── */}
        <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={{ ...fadeTransition, delay: 0.1 }}>
          <div className="hud-label mb-3">◈ VISUAL INPUT</div>

          {/* Image area */}
          <div
            className="relative overflow-hidden mb-4"
            style={{
              aspectRatio: "1",
              background: "rgba(6,10,26,0.9)",
              border: `1px solid ${imagePreview ? "rgba(99,102,241,0.4)" : "rgba(30,35,60,0.6)"}`,
              borderRadius: "4px",
              transition: "border-color 0.3s ease",
            }}
          >
            <CornerBrackets color={imagePreview ? "rgba(99,102,241,0.7)" : "rgba(30,35,60,0.7)"} />

            <AnimatePresence mode="wait">
              {imagePreview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                >
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />

                  {/* Scanning overlay */}
                  <AnimatePresence>
                    {scanning && (
                      <motion.div
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ background: "rgba(4,7,18,0.55)", backdropFilter: "blur(1px)" }}
                      >
                        <ScanLine />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                          <div
                            className="w-14 h-14 flex items-center justify-center"
                            style={{
                              background: "rgba(99,102,241,0.15)",
                              border: "1px solid rgba(99,102,241,0.5)",
                              borderRadius: "4px",
                            }}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                            >
                              <Scan className="w-6 h-6" style={{ color: "rgba(129,140,248,0.9)" }} />
                            </motion.div>
                          </div>
                          <span
                            className="hud-label animate-glow-breathe"
                            style={{ color: "rgba(129,140,248,0.9)", fontSize: "0.6rem" }}
                          >
                            ANALYZING...
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Clear button */}
                  {!scanning && (
                    <button
                      onClick={handleReset}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center transition-all duration-200"
                      style={{
                        background: "rgba(4,7,18,0.85)",
                        border: "1px solid rgba(239,68,68,0.4)",
                        borderRadius: "3px",
                        color: "rgba(248,113,113,0.8)",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(4,7,18,0.85)";
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6"
                >
                  <div
                    className="w-16 h-16 flex items-center justify-center"
                    style={{
                      background: "rgba(99,102,241,0.06)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      borderRadius: "4px",
                    }}
                  >
                    <Eye className="w-8 h-8" style={{ color: "rgba(99,102,241,0.4)" }} />
                  </div>
                  <div className="text-center">
                    <div className="hud-label mb-1">NO IMAGE LOADED</div>
                    <p style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.75rem" }}>
                      Upload or capture an image to begin scan
                    </p>
                  </div>

                  {/* Upload / Camera buttons */}
                  <div className="flex gap-3 w-full max-w-xs">
                    <button
                      onClick={triggerUpload}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 font-bold transition-all duration-200"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.06em",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "3px",
                        color: "rgba(165,180,252,0.85)",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)"}
                    >
                      <Upload className="w-3.5 h-3.5" /> UPLOAD
                    </button>
                    <button
                      onClick={triggerCamera}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 font-bold transition-all duration-200"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        letterSpacing: "0.06em",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "3px",
                        color: "rgba(165,180,252,0.85)",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)"}
                    >
                      <Camera className="w-3.5 h-3.5" /> CAMERA
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* When image is loaded — show upload/scan actions */}
          {imagePreview && (
            <div className="flex gap-3">
              <button
                onClick={triggerUpload}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 px-4 py-2.5 font-bold transition-all duration-200"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.06em",
                  background: "rgba(15,20,40,0.8)",
                  border: "1px solid rgba(30,35,60,0.7)",
                  borderRadius: "3px",
                  color: "rgba(100,116,139,0.7)",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(165,180,252,0.8)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.7)"}
              >
                <RefreshCw className="w-3.5 h-3.5" /> REPLACE
              </button>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                data-testid="button-analyze-image"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 font-bold transition-all duration-200"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  letterSpacing: "0.1em",
                  background: isAnalyzing ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.45)",
                  borderRadius: "3px",
                  color: isAnalyzing ? "rgba(99,102,241,0.5)" : "rgba(165,180,252,0.95)",
                  boxShadow: isAnalyzing ? "none" : "0 0 16px rgba(99,102,241,0.12)",
                }}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> SCANNING...</>
                ) : (
                  <><Zap className="w-4 h-4" /> ACTIVATE LENS</>
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Analysis panel ── */}
        <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={{ ...fadeTransition, delay: 0.18 }}>
          <div className="hud-label mb-3">◈ LUMINOUS ANALYSIS</div>

          <div
            className="relative min-h-[300px] lg:min-h-0 lg:h-full"
            style={{
              background: "rgba(6,10,26,0.9)",
              border: `1px solid ${analysis ? "rgba(99,102,241,0.35)" : error ? "rgba(239,68,68,0.3)" : "rgba(30,35,60,0.5)"}`,
              borderRadius: "4px",
              transition: "border-color 0.3s ease",
            }}
          >
            <CornerBrackets
              color={analysis ? "rgba(99,102,241,0.6)" : error ? "rgba(239,68,68,0.5)" : "rgba(30,35,60,0.6)"}
            />

            <AnimatePresence mode="wait">
              {!analysis && !error && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
                >
                  <div
                    className="w-14 h-14 flex items-center justify-center"
                    style={{
                      background: "rgba(99,102,241,0.05)",
                      border: "1px solid rgba(99,102,241,0.15)",
                      borderRadius: "4px",
                    }}
                  >
                    <Scan className="w-7 h-7" style={{ color: "rgba(99,102,241,0.25)" }} />
                  </div>
                  <div className="hud-label">AWAITING SCAN</div>
                  <p style={{ color: "rgba(100,116,139,0.45)", fontSize: "0.75rem" }}>
                    Load an image and press Activate Lens to begin
                  </p>
                </motion.div>
              )}

              {error && !analysis && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
                >
                  <div
                    className="w-14 h-14 flex items-center justify-center"
                    style={{
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "4px",
                    }}
                  >
                    <X className="w-7 h-7" style={{ color: "rgba(248,113,113,0.7)" }} />
                  </div>
                  <div className="hud-label" style={{ color: "rgba(239,68,68,0.6)" }}>SCAN ERROR</div>
                  <p style={{ color: "rgba(248,113,113,0.7)", fontSize: "0.78rem", lineHeight: 1.5 }}>
                    {error}
                  </p>
                  <button
                    onClick={handleAnalyze}
                    className="mt-2 px-4 py-2 font-bold text-xs tracking-widest transition-all duration-200"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: "3px",
                      color: "rgba(248,113,113,0.8)",
                    }}
                  >
                    RETRY SCAN
                  </button>
                </motion.div>
              )}

              {analysis && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, filter: "blur(6px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className="p-5"
                >
                  {/* Luminous badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1"
                      style={{
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: "3px",
                      }}
                    >
                      <Eye className="w-3 h-3" style={{ color: "rgba(129,140,248,0.8)" }} />
                      <span className="hud-label" style={{ color: "rgba(129,140,248,0.8)", fontSize: "0.55rem" }}>
                        LUMINOUS SCAN COMPLETE
                      </span>
                    </div>
                  </div>

                  {/* Analysis text */}
                  <div
                    className="leading-relaxed whitespace-pre-wrap"
                    style={{ color: "rgba(199,210,254,0.88)", fontSize: "0.85rem", lineHeight: 1.7 }}
                  >
                    {analysis}
                  </div>

                  {/* New scan button */}
                  <button
                    onClick={handleReset}
                    className="mt-5 flex items-center gap-2 px-3 py-2 font-bold transition-all duration-200"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.68rem",
                      letterSpacing: "0.06em",
                      background: "rgba(15,20,40,0.7)",
                      border: "1px solid rgba(30,35,60,0.7)",
                      borderRadius: "3px",
                      color: "rgba(100,116,139,0.7)",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(165,180,252,0.8)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.7)"}
                  >
                    <RefreshCw className="w-3 h-3" /> NEW SCAN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Tips row */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {[
          { icon: "🔍", label: "Objects & Scenes", desc: "Identify any physical object or environment" },
          { icon: "📄", label: "Text & Documents", desc: "Read, translate, or summarize written content" },
          { icon: "🍎", label: "Food & Nutrition", desc: "Get nutritional info and calorie estimates" },
        ].map((tip) => (
          <motion.div
            key={tip.label}
            variants={staggerChild}
            className="flex items-start gap-3 p-3"
            style={{
              background: "rgba(6,10,26,0.7)",
              border: "1px solid rgba(30,35,60,0.5)",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontSize: "1.2rem" }}>{tip.icon}</span>
            <div>
              <div style={{ color: "rgba(165,180,252,0.8)", fontSize: "0.78rem", fontWeight: 600 }}>{tip.label}</div>
              <div style={{ color: "rgba(100,116,139,0.65)", fontSize: "0.7rem" }}>{tip.desc}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
