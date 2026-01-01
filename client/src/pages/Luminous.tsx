import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, User, Bot, Image as ImageIcon, Mic, MicOff, Volume2 } from "lucide-react";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "image";
  data?: string;
};

export default function Luminous() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

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
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        handleSend(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          title: "Speech Error",
          description: "Could not recognize speech. Please try again.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        if (isListening) recognitionRef.current.start();
      };
    }
  }, [isListening]);

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
      const response = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS failed: ${errorText}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
    } catch (err) {
      console.error("TTS Error:", err);
      // Fallback to browser TTS if server TTS fails
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
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
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        type: data.type,
        data: data.data
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      if (data.type === "text" && isListening) {
        speak(data.message);
      }
    } catch (err) {
      toast({
        title: "Luminous Error",
        description: "Failed to connect to AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 relative">
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none"
          >
            <div className="text-center space-y-4">
              <motion.div
                initial={{ rotate: -10, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
              </motion.div>
              <h2 className="text-4xl md:text-6xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                Welcome {user?.username || "Rushik Sama"}
              </h2>
              <p className="text-xl text-muted-foreground font-medium">Luminous is ready for you</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Sparkles className="text-primary" /> Luminous
        </h1>
        <p className="text-muted-foreground">
          I am Luminous. How can I assist your glow up today?
        </p>
      </motion.div>

      <div className="flex-1 bg-card rounded-3xl border border-border/50 overflow-hidden flex flex-col mb-4 shadow-xl shadow-primary/5">
        <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === "user" ? 20 : -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`p-2 rounded-xl ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {m.role === "user" ? <User size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-4 relative group ${
                    m.role === "user" 
                      ? "bg-primary/10 text-foreground" 
                      : "bg-secondary/50 text-foreground"
                  }`}>
                    {m.type === "image" && m.data ? (
                      <div className="space-y-2">
                        <img src={m.data} alt="AI Generated" className="rounded-lg w-full h-auto shadow-md" />
                        <p className="text-sm italic">{m.content}</p>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    )}
                    {m.role === "assistant" && m.type !== "image" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => speak(m.content)}
                      >
                        <Volume2 size={14} />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="p-2 rounded-xl bg-secondary">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
                <div className="bg-secondary/30 rounded-2xl p-4">
                  <span className="text-sm italic animate-pulse">Luminous is thinking...</span>
                </div>
              </motion.div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 opacity-50">
                <Sparkles size={48} className="text-primary animate-pulse" />
                <p>Try asking about calorie tracking, math, or just say hello!</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 bg-muted/20">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Button
              type="button"
              size="icon"
              variant={isListening ? "default" : "outline"}
              onClick={toggleListening}
              className={`rounded-xl ${isListening ? "animate-pulse" : ""}`}
              disabled={isLoading}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : "Message Luminous..."}
              className="rounded-xl"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || !input.trim()}
              className="rounded-xl hover-elevate active-elevate-2"
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
