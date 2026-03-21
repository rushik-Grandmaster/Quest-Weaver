import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Send, Loader2, User, Bot, Mic, MicOff,
  Volume2, Camera, Upload, Search, X, ScanSearch, MessageSquare
} from "lucide-react";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image";
  data?: string;
};

type Tab = "chat" | "lens";

export default function Luminous() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Lens state
  const [lensImage, setLensImage] = useState<string | null>(null);
  const [lensAnalysis, setLensAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({ title: "Speech Error", description: "Could not recognize speech.", variant: "destructive" });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const speak = async (text: string) => {
    try {
      window.speechSynthesis?.cancel();
      const response = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      });
    } catch {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis?.speak(utterance);
    }
  };

  const handleSend = async (overrideInput?: string) => {
    const messageText = overrideInput || input;
    if (!messageText.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch(api.ai.chat.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("AI failed to respond");
      const data = await res.json();
      const assistantMessage: Message = { role: "assistant", content: data.message, type: data.type, data: data.data };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.message.toLowerCase().match(/added|created|removed|deleted|scheduled/)) {
        import("@/lib/queryClient").then(({ queryClient }) => {
          queryClient.invalidateQueries({ queryKey: [api.tasks.list.path] });
          queryClient.invalidateQueries({ queryKey: [api.shop.list.path] });
          queryClient.invalidateQueries({ queryKey: [api.schedule.list.path] });
        });
      }

      if (data.type === "text" && isListening) speak(data.message);
    } catch {
      toast({ title: "Luminous Error", description: "Failed to connect to AI. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Lens handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLensImage(reader.result as string);
        setLensAnalysis(null);
        if (fileInputRef.current) fileInputRef.current.removeAttribute("capture");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();
  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleLensAnalyze = async () => {
    if (!lensImage) return;
    setIsAnalyzing(true);
    try {
      const res = await apiRequest("POST", "/api/ai/lens", { image: lensImage });
      const data = await res.json();
      setLensAnalysis(data.analysis);
      toast({ title: "Analysis Complete", description: "Luminous has analyzed the image." });
    } catch {
      toast({ title: "Analysis Failed", description: "Please try a clearer photo.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendLensToChat = () => {
    if (!lensAnalysis) return;
    setMessages((prev) => [...prev, {
      role: "assistant",
      content: `🔍 **Luminous Lens Analysis:**\n\n${lensAnalysis}`,
      type: "text"
    }]);
    setActiveTab("chat");
    toast({ title: "Sent to Chat", description: "Lens result has been added to your conversation." });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-none mx-auto p-2 md:p-4 relative">
      {/* Welcome overlay */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-center space-y-4 px-8">
              <motion.div initial={{ rotate: -10, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.5 }}>
                <Sparkles className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                Welcome, Rushik Sama
              </h2>
              <p className="text-xl text-muted-foreground font-medium">Luminous is ready for you</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-2">
              <Sparkles className="text-primary" /> Luminous
            </h1>
            <p className="text-muted-foreground text-sm">Your AI life coach — chat or scan anything.</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mt-4 p-1 bg-muted/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-card text-primary shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat
            {messages.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs h-4 px-1">{messages.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("lens")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === "lens"
                ? "bg-card text-blue-400 shadow-sm border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ScanSearch className="w-4 h-4" />
            Luminous Lens
            {lensAnalysis && (
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
            )}
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ===== CHAT TAB ===== */}
        {activeTab === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 bg-card rounded-3xl border border-border/50 overflow-hidden flex flex-col shadow-xl shadow-primary/5">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-6 pb-2">
                  <AnimatePresence initial={false}>
                    {messages.map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: m.role === "user" ? 20 : -20, y: 10 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`p-2 rounded-xl flex-shrink-0 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20"}`}>
                          {m.role === "user" ? <User size={18} /> : <Sparkles size={18} className="text-primary" />}
                        </div>
                        <div className={`max-w-[85%] rounded-2xl p-4 relative group ${
                          m.role === "user"
                            ? "bg-primary/10 text-foreground rounded-tr-sm"
                            : "bg-secondary/60 text-foreground rounded-tl-sm"
                        }`}>
                          {m.type === "image" && m.data ? (
                            <div className="space-y-2">
                              <img src={m.data} alt="AI Generated" className="rounded-lg w-full h-auto shadow-md" />
                              <p className="text-sm italic text-muted-foreground">{m.content}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{m.content}</p>
                          )}
                          {m.role === "assistant" && m.type !== "image" && (
                            <button
                              className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted"
                              onClick={() => speak(m.content)}
                            >
                              <Volume2 size={14} className="text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20">
                        <Loader2 size={18} className="animate-spin text-primary" />
                      </div>
                      <div className="bg-secondary/40 rounded-2xl rounded-tl-sm p-4 flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </motion.div>
                  )}

                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center">
                          <Sparkles size={40} className="text-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg">How can I help you, Rushik Sama?</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">Ask me to create quests, plan your schedule, generate images, or just chat about your goals.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
                        {[
                          "Add a daily workout quest",
                          "What should I eat today?",
                          "Schedule study time for tomorrow",
                          "Analyze my progress"
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleSend(suggestion)}
                            className="text-left text-xs p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input bar */}
              <div className="p-4 border-t border-border/50 bg-muted/10">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={isListening ? "default" : "outline"}
                    onClick={toggleListening}
                    className={`rounded-xl flex-shrink-0 ${isListening ? "animate-pulse bg-red-500 border-red-500 hover:bg-red-600" : ""}`}
                    disabled={isLoading}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "🎙 Listening..." : "Message Luminous..."}
                    className="rounded-xl h-12 text-base flex-1"
                    disabled={isLoading}
                    data-testid="input-luminous-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="rounded-xl flex-shrink-0 h-12 w-12"
                    data-testid="button-send-message"
                  >
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== LENS TAB ===== */}
        {activeTab === "lens" && (
          <motion.div
            key="lens"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
              {/* Left: image input */}
              <div className="flex flex-col gap-4">
                <div className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-blue-400/30 bg-muted/20 overflow-hidden group">
                  {lensImage ? (
                    <>
                      <img src={lensImage} className="w-full h-full object-cover" alt="Lens preview" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setLensImage(null); setLensAnalysis(null); }}
                        >
                          <X className="w-4 h-4 mr-1" /> Clear
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                        <ScanSearch className="w-8 h-8 text-blue-400/60" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-400">Point at anything</p>
                        <p className="text-xs text-muted-foreground mt-1">Objects, text, plants, food, landmarks...</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={triggerUpload} className="border-blue-400/30 hover:border-blue-400">
                          <Upload className="w-4 h-4 mr-2" /> Upload
                        </Button>
                        <Button variant="outline" size="sm" onClick={triggerCamera} className="border-blue-400/30 hover:border-blue-400">
                          <Camera className="w-4 h-4 mr-2" /> Camera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                {lensImage && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={triggerUpload} className="flex-1">
                      <Upload className="w-4 h-4 mr-2" /> Change Photo
                    </Button>
                    <Button
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                      size="sm"
                      onClick={handleLensAnalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Search className="w-4 h-4 mr-2" /> Identify</>
                      )}
                    </Button>
                  </div>
                )}

                {!lensImage && (
                  <div className="text-center text-xs text-muted-foreground p-4 bg-muted/20 rounded-xl border border-border/30">
                    <p className="font-medium mb-1">What Luminous Lens can do:</p>
                    <p>Identify objects • Read & translate text • Describe scenes • Analyze food • Recognize landmarks</p>
                  </div>
                )}
              </div>

              {/* Right: analysis result */}
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="wait">
                  {isAnalyzing && (
                    <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 bg-card rounded-2xl border border-border/50 p-8 flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      </div>
                      <p className="text-muted-foreground animate-pulse font-medium">Luminous is analyzing...</p>
                    </motion.div>
                  )}
                  {!isAnalyzing && lensAnalysis && (
                    <motion.div key="result" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      className="flex-1 flex flex-col gap-4">
                      <div className="flex-1 bg-card rounded-2xl border border-blue-400/20 overflow-hidden">
                        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2 bg-blue-500/5">
                          <ScanSearch className="w-4 h-4 text-blue-400" />
                          <span className="font-semibold text-sm">Luminous Lens Result</span>
                        </div>
                        <ScrollArea className="h-[300px] md:h-[400px]">
                          <div className="p-5">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{lensAnalysis}</p>
                          </div>
                        </ScrollArea>
                      </div>
                      <Button variant="outline" onClick={sendLensToChat} className="border-primary/30 hover:border-primary text-primary hover:text-primary">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send to Luminous Chat
                      </Button>
                    </motion.div>
                  )}
                  {!isAnalyzing && !lensAnalysis && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex-1 bg-card/50 rounded-2xl border border-dashed border-border/50 p-8 flex flex-col items-center justify-center gap-3 text-center">
                      <Bot className="w-10 h-10 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-sm">Upload or take a photo, then hit <span className="text-blue-400 font-medium">Identify</span> to see results here.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
