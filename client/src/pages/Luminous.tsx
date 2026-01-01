import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2, User, Bot, Image as ImageIcon } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(api.ai.chat.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
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
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Sparkles className="text-primary" /> Luminous
        </h1>
        <p className="text-muted-foreground">
          Welcome {user?.username || "Rushik Sama"}, I am Luminous. How can I assist your glow up today?
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
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
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
                <p>Try asking about calorie tracking, math, or generating an image!</p>
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
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Luminous..."
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
