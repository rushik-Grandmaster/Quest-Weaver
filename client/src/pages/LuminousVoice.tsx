import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, PhoneOff, Loader2, Sparkles, Volume2,
  AlertTriangle, MessageSquare, ArrowLeft, Square, Check, Play, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CallState = "idle" | "listening" | "thinking" | "speaking" | "error" | "ended";

type Turn = { role: "user" | "assistant"; content: string };

/* ─── split long text into sentence-sized chunks for TTS ── */
function chunkText(text: string, maxLen = 180): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  // Split on sentence boundaries first, then group up to maxLen.
  const sentences = cleaned.match(/[^.!?]+[.!?]+|\S+$/g) ?? [cleaned];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const piece = s.trim();
    if (!piece) continue;
    if ((buf + " " + piece).trim().length <= maxLen) {
      buf = (buf ? buf + " " : "") + piece;
    } else {
      if (buf) out.push(buf);
      // If the sentence itself is too long, hard-split on commas / words.
      if (piece.length > maxLen) {
        let rest = piece;
        while (rest.length > maxLen) {
          const cut = rest.lastIndexOf(",", maxLen);
          const idx = cut > 40 ? cut + 1 : rest.lastIndexOf(" ", maxLen);
          const splitAt = idx > 0 ? idx : maxLen;
          out.push(rest.slice(0, splitAt).trim());
          rest = rest.slice(splitAt).trim();
        }
        buf = rest;
      } else {
        buf = piece;
      }
    }
  }
  if (buf) out.push(buf);
  return out;
}

/* ─── tiny corner brackets ────────────────────────────── */
function Brackets({ color = "rgba(99,102,241,0.4)" }: { color?: string }) {
  const s: React.CSSProperties = { borderColor: color };
  return (
    <>
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l" style={s} />
      <div className="absolute top-0 right-0 w-3 h-3 border-t border-r" style={s} />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l" style={s} />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r" style={s} />
    </>
  );
}

/* ═════════════════════════════════════════════════════ */
export default function LuminousVoice() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  /* ─── state ───────────────────────────────────────── */
  const [callState, setCallState] = useState<CallState>("idle");
  const [interim, setInterim] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [muted, setMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  /* ─── refs (so async callbacks see fresh values) ──── */
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const ttsPrimedRef = useRef(false);
  const ttsWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ttsPumpRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<number | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const stateRef = useRef<CallState>("idle");
  const mutedRef = useRef(false);
  const respondingRef = useRef(false);
  const animRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  /* keep refs in sync */
  useEffect(() => { stateRef.current = callState; }, [callState]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [turns, interim]);

  /* feature check */
  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (!SR) setSupported(false);
  }, []);

  /* ─── load best speech-synthesis voice ────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const pickBestVoice = (): SpeechSynthesisVoice | null => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return null;
      const en = voices.filter(v => /^en/i.test(v.lang));
      const pool = en.length ? en : voices;

      // Names that are explicitly male — avoid these.
      const maleNames = /\b(male|man|boy|guy|david|mark|george|james|fred|alex|daniel|tom|paul|peter|brian|kevin|ryan|matthew|jacob|aaron|guy|liam|noah|ethan|oliver|william|henry|sebastian|elijah|benjamin|lucas|jackson|owen|levi|leo|jack|carter|wyatt|julian|grayson|isaac|diego|antonio|miguel|jorge|carlos|rishi|hemant|aditi)\b/i;

      // Explicitly female-named voices we know about across browsers.
      const femaleNames = /\b(female|woman|girl|aria|jenny|zira|eva|samantha|allison|ava|susan|victoria|karen|moira|tessa|fiona|kate|serena|veena|catherine|amelie|amelia|sophie|sophia|emma|olivia|isabella|mia|charlotte|amaira|saanvi|sara|chloe|ella|nora|lily|hannah|grace|aria|nova|joanna|salli|kimberly|kendra|ivy|kajal|raveena|aditi|priya|shruti|elsa|google\s+us\s+english|natural)\b/i;

      const isMaleName = (v: SpeechSynthesisVoice) => maleNames.test(v.name);
      const isFemaleName = (v: SpeechSynthesisVoice) => femaleNames.test(v.name);

      // Priority list: most natural-sounding female voices first.
      const tests: ((v: SpeechSynthesisVoice) => boolean)[] = [
        v => /aria.*(online|natural)/i.test(v.name) && !isMaleName(v),
        v => /jenny.*(online|natural)/i.test(v.name) && !isMaleName(v),
        v => /natural/i.test(v.name) && isFemaleName(v),
        v => /samantha/i.test(v.name),
        v => /google\s+us\s+english/i.test(v.name), // Google's en-US default IS female
        v => /google\s+uk\s+english\s+female/i.test(v.name),
        v => /microsoft.*(zira|aria|jenny|eva)/i.test(v.name),
        v => isFemaleName(v) && !isMaleName(v),
        v => /female/i.test(v.name),
      ];

      for (const t of tests) {
        const m = pool.find(t);
        if (m) return m;
      }

      // Fallback: any voice that ISN'T explicitly male.
      const nonMale = pool.find(v => !isMaleName(v));
      if (nonMale) return nonMale;

      return pool[0];
    };

    const load = () => {
      const all = window.speechSynthesis.getVoices();
      // Show English first, then everything else, alphabetically by name.
      const sorted = [...all].sort((a, b) => {
        const aEn = /^en/i.test(a.lang) ? 0 : 1;
        const bEn = /^en/i.test(b.lang) ? 0 : 1;
        if (aEn !== bEn) return aEn - bEn;
        return a.name.localeCompare(b.name);
      });
      setVoices(sorted);

      // Restore the user's saved choice if it still exists on this device.
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("luminousVoiceName") : null;
      if (saved) {
        const found = all.find(v => v.name === saved);
        if (found) {
          voiceRef.current = found;
          setSelectedVoiceName(found.name);
          return;
        }
      }
      const best = pickBestVoice();
      voiceRef.current = best;
      setSelectedVoiceName(best?.name ?? null);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  /* ─── manually pick & preview a voice ──────────────── */
  const selectVoice = useCallback((voice: SpeechSynthesisVoice) => {
    voiceRef.current = voice;
    setSelectedVoiceName(voice.name);
    try { localStorage.setItem("luminousVoiceName", voice.name); } catch {}
    // Preview the voice immediately so the user knows what it sounds like.
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance("Hello Rushik Sama. This is your voice.");
        utt.voice = voice;
        utt.lang = voice.lang;
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.volume = 1.0;
        window.speechSynthesis.speak(utt);
      } catch {}
    }
  }, []);

  const previewVoice = useCallback((voice: SpeechSynthesisVoice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance("Greetings, Rushik Sama. I am Luminous.");
      utt.voice = voice;
      utt.lang = voice.lang;
      utt.rate = 1.0;
      window.speechSynthesis.speak(utt);
    } catch {}
  }, []);

  /* ─── mic level visualizer loop ──────────────────── */
  const visualize = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (stateRef.current === "ended" || stateRef.current === "idle") return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      setMicLevel(Math.min(1, avg / 80));
      animRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  /* ─── send transcript → Luminous → TTS → resume ──── */
  const respond = useCallback(async (userText: string) => {
    if (respondingRef.current) return;
    respondingRef.current = true;
    setInterim("");

    const userTurn: Turn = { role: "user", content: userText };
    setTurns(prev => [...prev, userTurn]);
    setCallState("thinking");

    /* pause STT while AI responds */
    try { recognitionRef.current?.stop(); } catch {}

    try {
      /* 1. ensure session */
      if (sessionIdRef.current === null) {
        const sres = await fetch("/api/ai/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: "🎙 Live Voice Chat" }),
        });
        if (sres.ok) sessionIdRef.current = (await sres.json()).id;
      }

      /* 2. ask Luminous */
      const cres = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userText,
          history: turnsRef.current.map(t => ({ role: t.role, content: t.content })),
          sessionId: sessionIdRef.current,
        }),
      });
      if (!cres.ok) throw new Error("Luminous unreachable");
      const data = await cres.json();
      const replyText: string = data.message ?? "...";

      const aiTurn: Turn = { role: "assistant", content: replyText };
      setTurns(prev => [...prev, aiTurn]);
      setCallState("speaking");

      /* 3. Speak via browser speech-synthesis (free, no API needed) */
      const synth = window.speechSynthesis;

      const resume = () => {
        if (ttsWatchdogRef.current) { clearTimeout(ttsWatchdogRef.current); ttsWatchdogRef.current = null; }
        if (ttsPumpRef.current) { clearInterval(ttsPumpRef.current); ttsPumpRef.current = null; }
        utteranceRef.current = null;
        respondingRef.current = false;
        if (stateRef.current !== "ended") {
          setCallState("listening");
          try { recognitionRef.current?.start(); } catch {}
        }
      };

      if (!synth) {
        console.warn("speechSynthesis not available — skipping TTS");
        resume();
        return;
      }

      // Cancel any prior speech and reset paused state
      try { synth.cancel(); } catch {}
      try { synth.resume(); } catch {}

      // Speak in chunks so long replies don't trip the Chrome ~15s cutoff
      // and so each sentence starts faster.
      const chunks = chunkText(replyText.slice(0, 4000), 180);
      let chunkIdx = 0;
      let speechStarted = false;

      const speakNext = () => {
        if (stateRef.current === "ended") { resume(); return; }
        if (chunkIdx >= chunks.length) { resume(); return; }

        const text = chunks[chunkIdx++];
        const utt = new SpeechSynthesisUtterance(text);
        // Setting .voice is unreliable on some mobile browsers — only override
        // when we actually picked one and it's a remote (cloud) voice.
        if (voiceRef.current) {
          try { utt.voice = voiceRef.current; } catch {}
        }
        utt.lang = voiceRef.current?.lang ?? "en-US";
        utt.rate = 1.0;
        utt.pitch = 1.0;
        utt.volume = 1.0;
        utteranceRef.current = utt;

        utt.onstart = () => {
          speechStarted = true;
          if (ttsWatchdogRef.current) { clearTimeout(ttsWatchdogRef.current); ttsWatchdogRef.current = null; }
          // Chrome bug: speech stops after ~15s. Pump pause/resume to keep alive.
          if (ttsPumpRef.current) clearInterval(ttsPumpRef.current);
          ttsPumpRef.current = setInterval(() => {
            try {
              if (synth.speaking && !synth.paused) {
                synth.pause();
                synth.resume();
              }
            } catch {}
          }, 10000);
        };
        utt.onboundary = (e) => {
          if ((e as any).name === "word" || !(e as any).name) {
            setMicLevel(0.4 + Math.random() * 0.6);
          }
        };
        utt.onend = () => {
          if (ttsPumpRef.current) { clearInterval(ttsPumpRef.current); ttsPumpRef.current = null; }
          speakNext();
        };
        utt.onerror = (e) => {
          console.warn("TTS error", (e as any)?.error || e);
          if (ttsPumpRef.current) { clearInterval(ttsPumpRef.current); ttsPumpRef.current = null; }
          // Try the next chunk; if no chunks left, resume listening
          speakNext();
        };

        try {
          synth.speak(utt);
        } catch (err) {
          console.warn("synth.speak threw", err);
          resume();
          return;
        }

        // Watchdog: if onstart never fires within 2.5s, the browser is
        // silently refusing (very common on mobile). Resume listening.
        if (chunkIdx === 1) {
          ttsWatchdogRef.current = setTimeout(() => {
            if (!speechStarted) {
              console.warn("TTS watchdog: speech never started — resuming listen.");
              try { synth.cancel(); } catch {}
              setErrorMsg("Voice playback blocked by your browser. Tap the orb once to enable audio.");
              resume();
            }
          }, 2500);
        }
      };

      speakNext();
    } catch (err: any) {
      console.error("Voice loop error:", err);
      setErrorMsg(err.message || "Something went wrong");
      respondingRef.current = false;
      if (stateRef.current !== "ended") {
        setCallState("listening");
        try { recognitionRef.current?.start(); } catch {}
      }
    }
  }, []);

  /* ─── start the call ──────────────────────────────── */
  const startCall = useCallback(async () => {
    setErrorMsg(null);
    if (!supported) {
      setErrorMsg("Live voice requires Chrome, Edge, or Safari (browser speech recognition).");
      return;
    }

    /* PRIME speech-synthesis inside the user-gesture so async TTS is allowed
       on mobile (iOS Safari & Android Chrome both require this). */
    if (window.speechSynthesis && !ttsPrimedRef.current) {
      try {
        window.speechSynthesis.cancel();
        const warmup = new SpeechSynthesisUtterance(" ");
        warmup.volume = 0;
        warmup.rate = 1;
        window.speechSynthesis.speak(warmup);
        // Trigger voice list load on browsers that need a kick
        window.speechSynthesis.getVoices();
        ttsPrimedRef.current = true;
      } catch {}
    }

    try {
      /* mic permission + stream */
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      /* analyser for visualizer */
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      audioCtxRef.current = ctx;
      analyserRef.current = an;

      /* recognition */
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";

      r.onresult = (e: any) => {
        if (respondingRef.current || mutedRef.current) return;
        let interimChunk = "";
        let finalChunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalChunk += t;
          else interimChunk += t;
        }
        if (interimChunk) setInterim(interimChunk);
        if (finalChunk.trim()) {
          respond(finalChunk.trim());
        }
      };

      r.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        console.warn("STT error:", e.error);
        if (e.error === "not-allowed") {
          setErrorMsg("Microphone permission denied. Enable it in browser settings.");
          endCall();
        }
      };

      r.onend = () => {
        /* auto-restart while call is alive and we're not in the middle of responding */
        if (stateRef.current !== "ended" && !respondingRef.current) {
          try { r.start(); } catch {}
        }
      };

      recognitionRef.current = r;

      setCallState("listening");
      stateRef.current = "listening";
      r.start();
      visualize();
    } catch (err: any) {
      console.error("startCall error:", err);
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Microphone permission denied. Enable it in browser settings to start."
          : err.message || "Could not start voice call"
      );
      setCallState("error");
    }
  }, [respond, supported, visualize]);

  /* ─── end call & cleanup ──────────────────────────── */
  const endCall = useCallback(() => {
    stateRef.current = "ended";
    setCallState("ended");
    try { recognitionRef.current?.stop(); } catch {}
    try { recognitionRef.current?.abort?.(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    if (ttsWatchdogRef.current) { clearTimeout(ttsWatchdogRef.current); ttsWatchdogRef.current = null; }
    if (ttsPumpRef.current) { clearInterval(ttsPumpRef.current); ttsPumpRef.current = null; }
    utteranceRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    respondingRef.current = false;
  }, []);

  /* interrupt currently-playing TTS to speak */
  const interruptTTS = () => {
    if (callState !== "speaking") return;
    try { window.speechSynthesis?.cancel(); } catch {}
    utteranceRef.current = null;
    respondingRef.current = false;
    setCallState("listening");
    try { recognitionRef.current?.start(); } catch {}
  };

  /* cleanup on unmount */
  useEffect(() => {
    return () => { endCall(); };
  }, [endCall]);

  /* ─── derived UI values ───────────────────────────── */
  const orbScale = (() => {
    if (callState === "speaking") return 1.18 + Math.sin(Date.now() / 220) * 0.06;
    if (callState === "thinking") return 1.06;
    if (callState === "listening" && !muted) return 1 + micLevel * 0.35;
    return 1;
  })();

  const stateLabel = (() => {
    switch (callState) {
      case "idle":      return "TAP TO BEGIN";
      case "listening": return muted ? "MUTED" : "LISTENING...";
      case "thinking":  return "LUMINOUS IS THINKING";
      case "speaking":  return "LUMINOUS IS SPEAKING";
      case "error":     return "ERROR";
      case "ended":     return "CALL ENDED";
    }
  })();

  const stateColor = (() => {
    switch (callState) {
      case "listening": return muted ? "rgba(239,68,68,0.85)" : "rgba(99,102,241,0.95)";
      case "thinking":  return "rgba(234,179,8,0.95)";
      case "speaking":  return "rgba(34,197,94,0.95)";
      case "error":     return "rgba(239,68,68,0.95)";
      default:          return "rgba(148,163,184,0.85)";
    }
  })();

  /* ════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════ */
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(30,27,75,0.55) 0%, rgba(6,8,22,1) 70%), #04060f",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* ── Top bar ─────────────────────────────────── */}
      <header className="flex items-center justify-between p-4 md:p-6 z-10">
        <button
          onClick={() => { endCall(); setLocation("/luminous"); }}
          data-testid="button-back-to-luminous"
          className="flex items-center gap-2 px-3 py-2 transition-all duration-200"
          style={{
            background: "rgba(10,14,30,0.7)",
            border: "1px solid rgba(30,35,60,0.6)",
            borderRadius: "3px",
            color: "rgba(148,163,184,0.85)",
            fontSize: "0.7rem",
            letterSpacing: "0.06em",
            fontWeight: 700,
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> EXIT
        </button>

        <div className="text-center">
          <div className="hud-label">◈ LIVE VOICE LINK</div>
          <div
            className="font-black tracking-widest uppercase"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.95rem",
              color: "rgba(199,210,254,0.95)",
            }}
          >
            Luminous
          </div>
        </div>

        <button
          onClick={() => setShowVoicePicker(true)}
          data-testid="button-open-voice-picker"
          className="flex items-center gap-2 px-3 py-2 transition-all duration-200 max-w-[180px]"
          style={{
            background: "rgba(10,14,30,0.7)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "3px",
            color: "rgba(199,210,254,0.9)",
            fontSize: "0.65rem",
            letterSpacing: "0.05em",
            fontWeight: 700,
          }}
          title="Change voice"
        >
          <Volume2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {selectedVoiceName ? selectedVoiceName.replace(/^Microsoft\s+|^Google\s+/, "") : "VOICE"}
          </span>
        </button>
      </header>

      {/* ── Voice picker overlay ──────────────────────── */}
      <AnimatePresence>
        {showVoicePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowVoicePicker(false)}
            data-testid="overlay-voice-picker"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md flex flex-col"
              style={{
                background: "linear-gradient(180deg, rgba(15,18,40,0.98) 0%, rgba(8,11,28,0.98) 100%)",
                border: "1px solid rgba(99,102,241,0.4)",
                borderRadius: "6px",
                maxHeight: "75vh",
                boxShadow: "0 0 60px rgba(99,102,241,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: "rgba(99,102,241,0.25)" }}
              >
                <div>
                  <div className="hud-label" style={{ color: "rgba(165,180,252,0.85)" }}>◈ SELECT VOICE</div>
                  <div style={{ color: "rgba(148,163,184,0.65)", fontSize: "0.7rem", marginTop: "2px" }}>
                    {voices.length} available • Tap to choose, ▶ to preview
                  </div>
                </div>
                <button
                  onClick={() => setShowVoicePicker(false)}
                  data-testid="button-close-voice-picker"
                  className="w-8 h-8 flex items-center justify-center"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    borderRadius: "3px",
                    color: "rgba(248,113,113,0.95)",
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto scrollbar-app flex-1 p-2">
                {voices.length === 0 ? (
                  <div
                    className="p-6 text-center"
                    style={{ color: "rgba(148,163,184,0.6)", fontSize: "0.8rem" }}
                  >
                    No voices loaded yet. Try waiting a moment, or your browser may not expose any voices.
                  </div>
                ) : (
                  voices.map((v) => {
                    const isSelected = v.name === selectedVoiceName;
                    return (
                      <button
                        key={`${v.name}-${v.lang}`}
                        onClick={() => selectVoice(v)}
                        data-testid={`button-voice-${v.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                        className="w-full flex items-center gap-3 p-3 mb-1 transition-all duration-150 text-left"
                        style={{
                          background: isSelected ? "rgba(99,102,241,0.18)" : "rgba(10,14,30,0.5)",
                          border: `1px solid ${isSelected ? "rgba(99,102,241,0.55)" : "rgba(30,35,60,0.6)"}`,
                          borderRadius: "3px",
                        }}
                      >
                        <div
                          className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                          style={{
                            border: `1px solid ${isSelected ? "rgba(99,102,241,0.7)" : "rgba(99,102,241,0.3)"}`,
                            borderRadius: "2px",
                            background: isSelected ? "rgba(99,102,241,0.25)" : "transparent",
                          }}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" style={{ color: "rgba(199,210,254,1)" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-bold truncate"
                            style={{
                              color: isSelected ? "rgba(199,210,254,1)" : "rgba(199,210,254,0.85)",
                              fontSize: "0.78rem",
                            }}
                          >
                            {v.name}
                          </div>
                          <div style={{ color: "rgba(148,163,184,0.55)", fontSize: "0.65rem", marginTop: "2px" }}>
                            {v.lang}{v.localService ? " • LOCAL" : " • CLOUD"}{v.default ? " • DEFAULT" : ""}
                          </div>
                        </div>
                        <button
                          onClick={(e) => previewVoice(v, e)}
                          data-testid={`button-preview-${v.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                          className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                          style={{
                            background: "rgba(99,102,241,0.12)",
                            border: "1px solid rgba(99,102,241,0.35)",
                            borderRadius: "3px",
                            color: "rgba(165,180,252,0.95)",
                          }}
                          title="Preview this voice"
                        >
                          <Play className="w-3.5 h-3.5" fill="currentColor" />
                        </button>
                      </button>
                    );
                  })
                )}
              </div>

              <div
                className="p-3 border-t text-center"
                style={{
                  borderColor: "rgba(99,102,241,0.2)",
                  color: "rgba(148,163,184,0.55)",
                  fontSize: "0.65rem",
                  letterSpacing: "0.05em",
                }}
              >
                Choice is saved to this device. CLOUD voices sound more natural.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main orb area ───────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 relative">

        {/* ambient glow rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3].map((r) => (
            <motion.div
              key={r}
              className="absolute rounded-full"
              style={{
                width: 260 + r * 90,
                height: 260 + r * 90,
                border: "1px solid rgba(99,102,241,0.05)",
              }}
              animate={{ rotate: 360 * (r % 2 === 0 ? 1 : -1) }}
              transition={{ duration: 60 + r * 20, repeat: Infinity, ease: "linear" }}
            />
          ))}
        </div>

        {/* state label above orb */}
        <motion.div
          key={stateLabel}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-2"
          style={{ color: stateColor, fontSize: "0.72rem", letterSpacing: "0.18em", fontWeight: 800 }}
        >
          {callState === "thinking" && <Loader2 className="w-3 h-3 animate-spin" />}
          {callState === "speaking" && <Volume2 className="w-3 h-3" />}
          {callState === "listening" && !muted && <Mic className="w-3 h-3" />}
          {muted && <MicOff className="w-3 h-3" />}
          {stateLabel}
        </motion.div>

        {/* the orb */}
        <motion.div
          className="relative"
          animate={{ scale: orbScale }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* outer halo */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              width: 240, height: 240,
              background: `radial-gradient(circle, ${stateColor.replace("0.95", "0.25").replace("0.85", "0.2")} 0%, transparent 70%)`,
              filter: "blur(20px)",
              transform: "translate(-50%, -50%)",
              left: "50%", top: "50%",
            }}
          />

          {/* core orb */}
          <div
            className="relative flex items-center justify-center rounded-full overflow-hidden"
            style={{
              width: 220, height: 220,
              background:
                "radial-gradient(circle at 35% 30%, rgba(165,180,252,0.35) 0%, rgba(67,56,202,0.45) 35%, rgba(15,23,42,0.95) 75%)",
              border: `2px solid ${stateColor}`,
              boxShadow: `
                0 0 60px ${stateColor.replace("0.95", "0.35")},
                0 0 120px ${stateColor.replace("0.95", "0.18")},
                inset 0 0 60px rgba(99,102,241,0.2)
              `,
            }}
          >
            {/* inner spinning rune */}
            <motion.div
              className="absolute inset-4 rounded-full"
              style={{
                border: `1px dashed ${stateColor.replace("0.95", "0.35")}`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-10 rounded-full"
              style={{
                border: `1px solid ${stateColor.replace("0.95", "0.55")}`,
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            />
            <Sparkles className="w-12 h-12 relative z-10" style={{ color: stateColor }} />
          </div>

          {/* mic level bars when listening */}
          {callState === "listening" && !muted && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const h = Math.max(4, Math.min(32, micLevel * 32 * (0.6 + Math.sin((Date.now() / 120) + i) * 0.4)));
                return (
                  <div
                    key={i}
                    style={{
                      width: 3,
                      height: h,
                      background: stateColor,
                      borderRadius: 1,
                      opacity: 0.7,
                      transition: "height 80ms linear",
                    }}
                  />
                );
              })}
            </div>
          )}
        </motion.div>

        {/* live interim transcript */}
        <div className="mt-16 min-h-[3rem] max-w-xl text-center px-4">
          <AnimatePresence mode="wait">
            {interim && callState === "listening" ? (
              <motion.p
                key="interim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: "rgba(199,210,254,0.85)",
                  fontSize: "0.92rem",
                  fontStyle: "italic",
                  fontFamily: "var(--font-mono)",
                }}
                data-testid="text-interim-transcript"
              >
                "{interim}"
              </motion.p>
            ) : turns.length > 0 && callState !== "idle" ? (
              <motion.p
                key={`last-${turns.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  color: turns[turns.length - 1].role === "assistant"
                    ? "rgba(199,210,254,0.95)"
                    : "rgba(148,163,184,0.7)",
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                }}
              >
                {turns[turns.length - 1].content.length > 200
                  ? turns[turns.length - 1].content.slice(0, 200) + "..."
                  : turns[turns.length - 1].content}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Error banner ──────────────────────────── */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto mb-3 px-4 py-2 flex items-center gap-2 max-w-md"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "3px",
              color: "rgba(248,113,113,0.95)",
              fontSize: "0.75rem",
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Conversation log preview ──────────────── */}
      {turns.length > 0 && (
        <div
          className="mx-auto w-full max-w-2xl px-4 mb-3 max-h-32 overflow-y-auto scrollbar-app"
          ref={transcriptRef}
        >
          <div className="space-y-1.5 pb-2">
            {turns.slice(-6).map((t, i) => (
              <div
                key={i}
                className="flex gap-2"
                style={{ fontSize: "0.7rem", lineHeight: 1.5 }}
              >
                <span
                  className="font-bold flex-shrink-0"
                  style={{
                    color: t.role === "user"
                      ? "rgba(148,163,184,0.7)"
                      : "rgba(165,180,252,0.85)",
                    minWidth: "60px",
                  }}
                >
                  {t.role === "user" ? "YOU" : "LUMINOUS"}
                </span>
                <span style={{ color: "rgba(199,210,254,0.7)" }}>
                  {t.content.length > 140 ? t.content.slice(0, 140) + "..." : t.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom controls ───────────────────────── */}
      <footer className="p-5 md:p-7 flex items-center justify-center gap-4 z-10">
        {callState === "idle" || callState === "ended" || callState === "error" ? (
          <button
            onClick={() => { setTurns([]); sessionIdRef.current = null; startCall(); }}
            data-testid="button-start-voice-call"
            className="relative flex items-center gap-3 px-7 py-4 font-black tracking-widest uppercase transition-all duration-200"
            style={{
              fontSize: "0.85rem",
              background: "rgba(99,102,241,0.18)",
              border: "1px solid rgba(99,102,241,0.55)",
              borderRadius: "3px",
              color: "rgba(199,210,254,1)",
              boxShadow: "0 0 30px rgba(99,102,241,0.25)",
            }}
          >
            <Brackets color="rgba(99,102,241,0.4)" />
            <Mic className="w-4 h-4" /> START VOICE CALL
          </button>
        ) : (
          <>
            {/* Mute toggle */}
            <button
              onClick={() => setMuted(m => !m)}
              data-testid="button-toggle-mute"
              className="w-14 h-14 flex items-center justify-center transition-all duration-200"
              style={{
                background: muted ? "rgba(239,68,68,0.2)" : "rgba(10,14,30,0.85)",
                border: `1px solid ${muted ? "rgba(239,68,68,0.55)" : "rgba(99,102,241,0.3)"}`,
                borderRadius: "50%",
                color: muted ? "rgba(248,113,113,0.95)" : "rgba(165,180,252,0.85)",
              }}
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Interrupt button (only while AI speaks) */}
            {callState === "speaking" && (
              <button
                onClick={interruptTTS}
                data-testid="button-interrupt-tts"
                className="w-14 h-14 flex items-center justify-center transition-all duration-200"
                style={{
                  background: "rgba(234,179,8,0.18)",
                  border: "1px solid rgba(234,179,8,0.5)",
                  borderRadius: "50%",
                  color: "rgba(253,224,71,0.95)",
                }}
                title="Interrupt"
              >
                <Square className="w-5 h-5" fill="currentColor" />
              </button>
            )}

            {/* End call (red) */}
            <button
              onClick={endCall}
              data-testid="button-end-call"
              className="w-16 h-16 flex items-center justify-center transition-all duration-200"
              style={{
                background: "rgba(239,68,68,0.85)",
                border: "1px solid rgba(239,68,68,1)",
                borderRadius: "50%",
                color: "white",
                boxShadow: "0 0 30px rgba(239,68,68,0.4)",
              }}
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </>
        )}
      </footer>

      {/* ── First-time hint ───────────────────────── */}
      {callState === "idle" && (
        <div className="text-center pb-6 px-6">
          <p style={{ color: "rgba(100,116,139,0.65)", fontSize: "0.72rem", lineHeight: 1.6 }}>
            Speak naturally — Luminous listens, thinks, and replies aloud.
            <br />
            Pause to let it answer. Tap <Square className="inline w-3 h-3" fill="currentColor" /> to interrupt while it speaks.
          </p>
        </div>
      )}
    </div>
  );
}
