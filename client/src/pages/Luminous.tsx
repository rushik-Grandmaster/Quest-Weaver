import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import {
  Sparkles, Send, Loader2, User, Mic, MicOff,
  Volume2, Camera, Upload, Search, X, ScanSearch,
  MessageSquare, Clock, Trash2, Plus, ChevronRight, Phone
} from "lucide-react";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isYesterday } from "date-fns";

type Message = {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image";
  data?: string;
};

type Tab = "chat" | "history" | "lens";

type Session = { id: number; title: string; createdAt: string; updatedAt: string };
type DbMessage = { id: number; role: string; content: string; type: string | null; createdAt: string };

function formatSessionDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today " + format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

// ── Styled wrappers ──
function HudButton({ onClick, disabled, children, active, className = "" }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; active?: boolean; className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center transition-all duration-200 ${className}`}
      style={{
        background: active ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.06)",
        border: `1px solid ${active ? "rgba(129,140,248,0.5)" : "rgba(99,102,241,0.2)"}`,
        borderRadius: "3px",
        color: active ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.8)",
        padding: "8px 10px",
      }}
    >
      {children}
    </button>
  );
}

export default function Luminous() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [, setLocation] = useLocation();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Lens state
  const [lensImage, setLensImage] = useState<string | null>(null);
  const [lensAnalysis, setLensAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // ── Session list ──
  const { data: sessions = [], refetch: refetchSessions } = useQuery<Session[]>({
    queryKey: ["/api/ai/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/ai/sessions", { credentials: "include" });
      return res.json();
    },
  });

  // ── Selected session messages ──
  const { data: sessionMessages = [] } = useQuery<DbMessage[]>({
    queryKey: ["/api/ai/sessions", selectedSession?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/ai/sessions/${selectedSession!.id}/messages`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedSession,
  });

  // ── Delete session ──
  const deleteSession = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ai/sessions/${id}`);
    },
    onSuccess: () => {
      refetchSessions();
      setSelectedSession(null);
      toast({ title: "Conversation deleted" });
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SR();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (e: any) => { setInput(e.results[e.results.length - 1][0].transcript); setIsListening(false); };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) { setIsListening(false); recognitionRef.current?.stop(); }
    else { setIsListening(true); recognitionRef.current?.start(); }
  };

  const speak = (text: string) => {
    // Browser speech-synthesis (the Replit AI proxy doesn't expose OpenAI TTS).
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text.slice(0, 4000));
      utt.lang = "en-US";
      utt.rate = 1.0;
      utt.pitch = 1.0;
      window.speechSynthesis.speak(utt);
    } catch {}
  };

  // Start a new session
  const startNewSession = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }), credentials: "include",
      });
      const session = await res.json();
      setCurrentSessionId(session.id);
      setMessages([]);
      refetchSessions();
      return session.id as number;
    } catch { return null; }
  }, [refetchSessions]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;

    // Create session on first message if none exists
    let sid = currentSessionId;
    if (!sid) sid = await startNewSession();

    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(api.ai.chat.path, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.map(m => ({ role: m.role, content: m.content })), sessionId: sid }),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const asstMsg: Message = { role: "assistant", content: data.message, type: data.type, data: data.data };
      setMessages(prev => [...prev, asstMsg]);
      refetchSessions();

      if (data.message.toLowerCase().match(/added|created|removed|deleted|scheduled/)) {
        queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.shop.list.path] });
        queryClient.invalidateQueries({ queryKey: [api.schedule.list.path] });
      }
      if (data.type === "text" && isListening) speak(data.message);
    } catch {
      toast({ title: "Luminous Error", description: "Failed to respond. Please try again.", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  // Lens handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setLensImage(reader.result as string); setLensAnalysis(null); };
      reader.readAsDataURL(file);
    }
  };
  const triggerUpload = () => { if (fileInputRef.current) { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); } };
  const triggerCamera = () => { if (fileInputRef.current) { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); } };

  const handleLensAnalyze = async () => {
    if (!lensImage) return;
    setIsAnalyzing(true);
    try {
      const res = await apiRequest("POST", "/api/ai/lens", { image: lensImage });
      const data = await res.json();
      setLensAnalysis(data.analysis);
    } catch { toast({ title: "Analysis Failed", description: "Please try a clearer photo.", variant: "destructive" }); }
    finally { setIsAnalyzing(false); }
  };

  const sendLensToChat = () => {
    if (!lensAnalysis) return;
    setMessages(prev => [...prev, { role: "assistant", content: `🔍 **Luminous Lens Analysis:**\n\n${lensAnalysis}`, type: "text" }]);
    setActiveTab("chat");
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "chat",    label: "Chat",    icon: MessageSquare },
    { id: "history", label: "History", icon: Clock },
    { id: "lens",    label: "Lens",    icon: ScanSearch },
  ];

  const panelStyle = {
    background: "rgba(4,7,18,0.95)",
    border: "1px solid rgba(99,102,241,0.18)",
    borderRadius: "6px",
  };

  return (
    <div className="flex flex-col h-full w-full p-3 md:p-5 gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="hud-label mb-1">◈ AI SYSTEM / LUMINOUS</div>
          <h1 className="text-2xl font-black" style={{
            fontFamily: "var(--font-display)",
            background: "linear-gradient(135deg, #e2e8f0, #c7d2fe 40%, #818cf8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Luminous
          </h1>
        </div>

        {/* Live Voice CTA + Tab switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/luminous/voice")}
            data-testid="button-launch-voice-call"
            className="flex items-center gap-1.5 px-3 py-2 transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.66rem",
              letterSpacing: "0.08em",
              fontWeight: 800,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.45)",
              borderRadius: "3px",
              color: "rgba(134,239,172,0.95)",
              boxShadow: "0 0 12px rgba(34,197,94,0.15)",
            }}
            title="Open immersive voice call"
          >
            <Phone className="w-3.5 h-3.5" />
            LIVE VOICE
          </button>

        <div className="flex gap-1 p-1" style={{ background: "rgba(4,7,18,0.8)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "4px" }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all duration-200"
                style={{
                  borderRadius: "3px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.08em",
                  background: isActive ? "rgba(99,102,241,0.2)" : "transparent",
                  border: isActive ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                  color: isActive ? "rgba(165,180,252,1)" : "rgba(100,116,139,0.7)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === "history" && sessions.length > 0 && (
                  <span className="ml-0.5 text-[9px] px-1 py-0.5" style={{ background: "rgba(99,102,241,0.3)", borderRadius: "2px", color: "rgba(165,180,252,0.9)" }}>
                    {sessions.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════ CHAT TAB ══════════ */}
        {activeTab === "chat" && (
          <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex flex-col min-h-0 gap-2"
          >
            {/* Session bar */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentSessionId ? (
                <div className="flex items-center gap-2 flex-1 px-3 py-1.5" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "3px" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="hud-label text-[10px]" style={{ color: "rgba(99,102,241,0.5)" }}>SESSION ACTIVE</span>
                  <span className="text-xs truncate flex-1" style={{ color: "rgba(148,163,184,0.7)", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                    {sessions.find(s => s.id === currentSessionId)?.title ?? "New Conversation"}
                  </span>
                </div>
              ) : (
                <div className="flex-1 px-3 py-1.5" style={{ background: "transparent", border: "1px dashed rgba(99,102,241,0.15)", borderRadius: "3px" }}>
                  <span className="hud-label text-[10px]" style={{ color: "rgba(99,102,241,0.35)" }}>NO SESSION — start typing to begin</span>
                </div>
              )}
              <HudButton onClick={startNewSession} className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>New</span>
              </HudButton>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1" ref={scrollRef}
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.2) transparent" }}
            >
              <div className="space-y-4 pb-2">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
                    <motion.div
                      animate={{ boxShadow: ["0 0 20px rgba(99,102,241,0.2)", "0 0 50px rgba(99,102,241,0.5)", "0 0 20px rgba(99,102,241,0.2)"] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-16 h-16 flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "4px" }}
                    >
                      <Sparkles className="w-8 h-8" style={{ color: "rgba(129,140,248,0.9)" }} />
                    </motion.div>
                    <div>
                      <p className="font-bold text-base" style={{ color: "rgba(199,210,254,0.9)", fontFamily: "var(--font-display)" }}>
                        How can I help you, Rushik Sama?
                      </p>
                      <p className="text-xs mt-1" style={{ color: "rgba(100,116,139,0.6)", fontFamily: "var(--font-mono)" }}>
                        I have full access to your player profile, quests, and history.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
                      {["Analyze my progress", "What quests should I focus on?", "How close am I to leveling up?", "Review my achievements", "What did I use from my inventory?", "Give me a motivational push"]
                        .map(s => (
                          <button key={s} onClick={() => handleSend(s)}
                            className="text-left text-xs p-3 transition-all"
                            style={{ background: "rgba(6,10,26,0.8)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "4px", color: "rgba(148,163,184,0.7)", fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.4)"; (e.currentTarget as HTMLElement).style.color = "rgba(165,180,252,0.9)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.15)"; (e.currentTarget as HTMLElement).style.color = "rgba(148,163,184,0.7)"; }}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: m.role === "user" ? 16 : -16, y: 6 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: m.role === "user" ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.08)",
                          border: `1px solid ${m.role === "user" ? "rgba(129,140,248,0.4)" : "rgba(99,102,241,0.2)"}`,
                          borderRadius: "3px",
                        }}
                      >
                        {m.role === "user"
                          ? <User size={15} style={{ color: "rgba(165,180,252,0.9)" }} />
                          : <Sparkles size={15} style={{ color: "rgba(129,140,248,0.9)" }} />}
                      </div>
                      <div className={`max-w-[82%] p-3.5 relative group`}
                        style={{
                          background: m.role === "user" ? "rgba(99,102,241,0.1)" : "rgba(6,10,26,0.9)",
                          border: `1px solid ${m.role === "user" ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"}`,
                          borderRadius: "4px",
                          color: "rgba(199,210,254,0.9)",
                        }}
                      >
                        {m.type === "image" && m.data ? (
                          <div className="space-y-2">
                            <img src={m.data} alt="AI" className="rounded w-full h-auto" />
                            <p className="text-xs italic" style={{ color: "rgba(100,116,139,0.7)" }}>{m.content}</p>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
                        )}
                        {m.role === "assistant" && m.type !== "image" && (
                          <button className="absolute -right-9 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5"
                            style={{ background: "rgba(6,10,26,0.9)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "3px" }}
                            onClick={() => speak(m.content)}
                          >
                            <Volume2 size={12} style={{ color: "rgba(99,102,241,0.6)" }} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center"
                      style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "3px" }}
                    >
                      <Loader2 size={15} className="animate-spin" style={{ color: "rgba(129,140,248,0.7)" }} />
                    </div>
                    <div className="flex gap-1.5 p-3" style={{ background: "rgba(6,10,26,0.9)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "4px" }}>
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(99,102,241,0.6)", animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="flex-shrink-0 flex gap-2">
              <HudButton onClick={toggleListening} active={isListening} disabled={isLoading}>
                {isListening ? <MicOff size={16} style={{ color: "rgba(248,113,113,0.9)" }} /> : <Mic size={16} />}
              </HudButton>
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex-1 flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={isListening ? "🎙 Listening…" : "Message Luminous…"}
                  disabled={isLoading}
                  data-testid="input-luminous-message"
                  className="flex-1 h-10 px-4 text-sm outline-none"
                  style={{
                    background: "rgba(6,10,26,0.9)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: "3px",
                    color: "rgba(199,210,254,0.9)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.5)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(99,102,241,0.2)")}
                />
                <HudButton active={!!input.trim()} disabled={isLoading || !input.trim()}>
                  <button type="submit" disabled={isLoading || !input.trim()} style={{ display: "contents" }} data-testid="button-send-message">
                    <Send size={16} />
                  </button>
                </HudButton>
              </form>
            </div>
          </motion.div>
        )}

        {/* ══════════ HISTORY TAB ══════════ */}
        {activeTab === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex min-h-0 gap-4"
          >
            {/* Session list */}
            <div className="w-56 md:w-64 flex-shrink-0 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <span className="hud-label">◈ CONVERSATIONS</span>
                <button onClick={async () => { await startNewSession(); setActiveTab("chat"); }}
                  className="hud-label flex items-center gap-1 transition-colors"
                  style={{ color: "rgba(99,102,241,0.5)" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(129,140,248,0.9)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(99,102,241,0.5)")}
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.15) transparent" }}>
                {sessions.length === 0 ? (
                  <div className="p-4 text-center" style={{ border: "1px dashed rgba(99,102,241,0.15)", borderRadius: "4px" }}>
                    <p className="hud-label" style={{ color: "rgba(99,102,241,0.35)" }}>NO HISTORY YET</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(100,116,139,0.5)" }}>Start chatting to save conversations.</p>
                  </div>
                ) : (
                  sessions.map(s => {
                    const isSelected = selectedSession?.id === s.id;
                    return (
                      <button key={s.id} onClick={() => setSelectedSession(s)}
                        className="w-full text-left p-3 flex items-start gap-2 transition-all duration-200 group"
                        style={{
                          background: isSelected ? "rgba(99,102,241,0.12)" : "rgba(6,10,26,0.7)",
                          border: `1px solid ${isSelected ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.12)"}`,
                          borderRadius: "4px",
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: isSelected ? "rgba(129,140,248,0.9)" : "rgba(99,102,241,0.4)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: isSelected ? "rgba(199,210,254,0.95)" : "rgba(148,163,184,0.8)" }}>
                            {s.title}
                          </p>
                          <p className="hud-label mt-0.5" style={{ fontSize: "0.58rem", color: "rgba(99,102,241,0.4)" }}>
                            {formatSessionDate(s.updatedAt)}
                          </p>
                        </div>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5" style={{ color: "rgba(99,102,241,0.5)" }} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message viewer */}
            <div className="flex-1 flex flex-col min-h-0" style={panelStyle}>
              {!selectedSession ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Clock className="w-10 h-10" style={{ color: "rgba(99,102,241,0.2)" }} />
                  <p className="hud-label" style={{ color: "rgba(99,102,241,0.35)" }}>SELECT A CONVERSATION</p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(99,102,241,0.15)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "rgba(199,210,254,0.9)", fontFamily: "var(--font-display)" }}>
                        {selectedSession.title}
                      </p>
                      <p className="hud-label mt-0.5" style={{ color: "rgba(99,102,241,0.4)" }}>
                        {formatSessionDate(selectedSession.createdAt)} · {sessionMessages.length} messages
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setMessages([]); setCurrentSessionId(selectedSession.id); setActiveTab("chat"); }}
                        className="px-3 py-1.5 text-xs transition-all"
                        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "3px", color: "rgba(165,180,252,0.9)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
                      >
                        ▸ Resume
                      </button>
                      <button onClick={() => deleteSession.mutate(selectedSession.id)}
                        className="p-1.5 transition-all"
                        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "3px", color: "rgba(248,113,113,0.7)" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.15) transparent" }}>
                    {sessionMessages.map((m, i) => (
                      <div key={i} className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center"
                          style={{ background: m.role === "user" ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "3px" }}
                        >
                          {m.role === "user" ? <User size={13} style={{ color: "rgba(165,180,252,0.8)" }} /> : <Sparkles size={13} style={{ color: "rgba(129,140,248,0.8)" }} />}
                        </div>
                        <div className="max-w-[80%] p-3"
                          style={{
                            background: m.role === "user" ? "rgba(99,102,241,0.08)" : "rgba(3,6,15,0.8)",
                            border: `1px solid ${m.role === "user" ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.1)"}`,
                            borderRadius: "4px",
                            color: "rgba(199,210,254,0.85)",
                          }}
                        >
                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                          <p className="mt-1.5 hud-label" style={{ fontSize: "0.55rem", color: "rgba(99,102,241,0.3)" }}>
                            {format(new Date(m.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════ LENS TAB ══════════ */}
        {activeTab === "lens" && (
          <motion.div key="lens" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0"
          >
            {/* Left: upload */}
            <div className="flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden group"
                style={{ background: "rgba(6,10,26,0.9)", border: "1px dashed rgba(59,130,246,0.3)", borderRadius: "6px" }}
              >
                {lensImage ? (
                  <>
                    <img src={lensImage} className="w-full h-full object-cover" alt="Lens" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                      style={{ background: "rgba(2,4,12,0.7)" }}
                    >
                      <button onClick={() => { setLensImage(null); setLensAnalysis(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs"
                        style={{ background: "rgba(4,7,18,0.9)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "3px", color: "rgba(165,180,252,0.9)", fontFamily: "var(--font-mono)" }}
                      >
                        <X className="w-3.5 h-3.5" /> Clear
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <ScanSearch className="w-10 h-10" style={{ color: "rgba(59,130,246,0.4)" }} />
                    <div className="text-center">
                      <p className="text-sm font-medium" style={{ color: "rgba(147,197,253,0.8)" }}>Point Luminous Lens at anything</p>
                      <p className="text-xs mt-1" style={{ color: "rgba(100,116,139,0.6)" }}>Objects · text · food · landmarks</p>
                    </div>
                    <div className="flex gap-2">
                      {[{ fn: triggerUpload, icon: Upload, label: "Upload" }, { fn: triggerCamera, icon: Camera, label: "Camera" }].map(({ fn, icon: Icon, label }) => (
                        <button key={label} onClick={fn}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs"
                          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "3px", color: "rgba(147,197,253,0.8)", fontFamily: "var(--font-mono)" }}
                        >
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

              {lensImage && (
                <div className="flex gap-2">
                  <button onClick={triggerUpload} className="flex-1 flex items-center justify-center gap-2 py-2 text-xs"
                    style={{ background: "rgba(6,10,26,0.8)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "3px", color: "rgba(148,163,184,0.7)", fontFamily: "var(--font-mono)" }}
                  >
                    <Upload className="w-3.5 h-3.5" /> Change
                  </button>
                  <button onClick={handleLensAnalyze} disabled={isAnalyzing} className="flex-1 flex items-center justify-center gap-2 py-2 text-xs"
                    style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "3px", color: "rgba(147,197,253,0.9)", fontFamily: "var(--font-mono)" }}
                  >
                    {isAnalyzing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</> : <><Search className="w-3.5 h-3.5" /> Identify</>}
                  </button>
                </div>
              )}
            </div>

            {/* Right: result */}
            <div className="flex flex-col gap-3">
              {isAnalyzing && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3" style={panelStyle}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(59,130,246,0.6)" }} />
                  <p className="hud-label animate-pulse" style={{ color: "rgba(59,130,246,0.5)" }}>ANALYZING IMAGE…</p>
                </div>
              )}
              {!isAnalyzing && lensAnalysis && (
                <div className="flex-1 flex flex-col" style={panelStyle}>
                  <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(59,130,246,0.15)" }}
                  >
                    <ScanSearch className="w-3.5 h-3.5" style={{ color: "rgba(59,130,246,0.7)" }} />
                    <span className="hud-label" style={{ color: "rgba(59,130,246,0.6)" }}>LENS RESULT</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(199,210,254,0.85)" }}>{lensAnalysis}</p>
                  </div>
                  <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(99,102,241,0.1)" }}>
                    <button onClick={sendLensToChat} className="w-full flex items-center justify-center gap-2 py-2 text-xs"
                      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "3px", color: "rgba(165,180,252,0.9)", fontFamily: "var(--font-mono)" }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Send to Chat
                    </button>
                  </div>
                </div>
              )}
              {!isAnalyzing && !lensAnalysis && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2" style={panelStyle}>
                  <ScanSearch className="w-8 h-8" style={{ color: "rgba(99,102,241,0.2)" }} />
                  <p className="hud-label" style={{ color: "rgba(99,102,241,0.3)" }}>AWAITING SCAN</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
