import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote as QuoteIcon, RefreshCw, Loader as Loader2, Sparkles } from "lucide-react";

type Quote = {
  text: string;
  author: string;
  category: "discipline" | "mindset" | "strength" | "growth";
};

const QUOTES: Quote[] = [
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", category: "discipline" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", category: "discipline" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "discipline" },
  { text: "The pain of discipline weighs ounces. The pain of regret weighs tons.", author: "Jim Rohn", category: "discipline" },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery", category: "growth" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown", category: "mindset" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown", category: "mindset" },
  { text: "Great things never come from comfort zones.", author: "Unknown", category: "mindset" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown", category: "mindset" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown", category: "growth" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown", category: "growth" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins", category: "strength" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi", category: "strength" },
  { text: "The wolf on the hill is not as hungry as the wolf climbing the hill.", author: "Unknown", category: "strength" },
  { text: "Suffer the pain of discipline or suffer the pain of regret.", author: "Jim Rohn", category: "discipline" },
  { text: "Arise. The only limit is the one you set yourself.", author: "System", category: "mindset" },
];

const CATEGORY_LABELS: Record<Quote["category"], string> = {
  all: "All",
  discipline: "◈ Discipline",
  mindset: "◈ Mindset",
  strength: "◈ Strength",
  growth: "◈ Growth",
};

const CATEGORY_COLORS: Record<string, string> = {
  discipline: "rgba(99,102,241,0.9)",
  mindset: "rgba(129,140,248,0.9)",
  strength: "rgba(239,68,68,0.85)",
  growth: "rgba(74,222,128,0.85)",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="hud-label">{children}</span>
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.3), transparent)" }} />
    </div>
  );
}

export default function Quotes() {
  const [filter, setFilter] = useState<string>("all");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return QUOTES;
    return QUOTES.filter((q) => q.category === filter);
  }, [filter]);

  const featured = QUOTES[featuredIndex] ?? QUOTES[0];

  const spinQuote = () => {
    setIsSpinning(true);
    setTimeout(() => {
      let next = Math.floor(Math.random() * QUOTES.length);
      if (next === featuredIndex) next = (next + 1) % QUOTES.length;
      setFeaturedIndex(next);
      setIsSpinning(false);
    }, 400);
  };

  return (
    <div className="p-5 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Featured Quote Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, rgba(4,7,18,0.0) 60%), rgba(6,10,26,0.95)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "6px",
          boxShadow: "0 0 40px rgba(99,102,241,0.07)",
        }}
      >
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "rgba(99,102,241,0.7)" }} />

        {/* Animated sweep scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.35), transparent)" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />

        {/* Breathing border glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[6px]"
          animate={{ boxShadow: ["0 0 0px rgba(99,102,241,0)", "0 0 30px rgba(99,102,241,0.1)", "0 0 0px rgba(99,102,241,0)"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 p-6 md:p-10 flex flex-col items-center text-center min-h-[280px] justify-center">
          <div className="hud-label mb-4">◈ DAILY DIRECTIVE</div>
          <AnimatePresence mode="wait">
            {!isSpinning ? (
              <motion.div
                key={featuredIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="max-w-2xl"
              >
                <QuoteIcon className="w-8 h-8 mx-auto mb-4" style={{ color: "rgba(129,140,248,0.6)" }} />
                <p
                  className="text-xl md:text-2xl font-bold leading-relaxed mb-4"
                  style={{
                    fontFamily: "var(--font-display)",
                    background: "linear-gradient(135deg, #e2e8f0, #c7d2fe 40%, #818cf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 24px rgba(99,102,241,0.3))",
                  }}
                >
                  "{featured.text}"
                </p>
                <p className="text-sm" style={{ fontFamily: "var(--font-mono)", color: "rgba(148,163,184,0.65)", letterSpacing: "0.08em" }}>
                  — {featured.author}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="spinning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center"
              >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={spinQuote}
            disabled={isSpinning}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-widest uppercase transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.8)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.08)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.25)";
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
            New Quote
          </button>
        </div>
      </motion.div>

      {/* Category filter */}
      <div>
        <SectionLabel>◈ ARCHIVE</SectionLabel>
        <div className="flex gap-2 flex-wrap mb-6">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded text-xs font-medium transition-all border"
              style={{
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                background: filter === key ? "rgba(99,102,241,0.15)" : "rgba(15,23,42,0.55)",
                borderColor: filter === key ? "rgba(165,180,252,0.7)" : "rgba(99,102,241,0.18)",
                color: filter === key ? "rgba(199,210,254,1)" : "rgba(148,163,184,0.85)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Quote grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((quote, i) => {
              const color = CATEGORY_COLORS[quote.category];
              return (
                <motion.div
                  key={`${quote.text}-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative p-5 overflow-hidden"
                  style={{
                    background: "rgba(6,10,26,0.9)",
                    border: `1px solid ${color}25`,
                    borderRadius: "4px",
                  }}
                  whileHover={{ borderColor: `${color}55`, boxShadow: `0 0 18px ${color}18` }}
                >
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: `${color}50` }} />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: `${color}50` }} />

                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3 h-3" style={{ color }} />
                    <span className="hud-label" style={{ color: `${color}80`, fontSize: "0.55rem" }}>
                      {quote.category.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(199,210,254,0.9)", fontFamily: "var(--font-sans)" }}>
                    "{quote.text}"
                  </p>
                  <p className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "rgba(100,116,139,0.7)", letterSpacing: "0.05em" }}>
                    — {quote.author}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <QuoteIcon className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "rgba(99,102,241,0.5)" }} />
          <p className="hud-label">◇ NO QUOTES IN THIS CATEGORY</p>
        </div>
      )}
    </div>
  );
}
