import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUpBlur, fadeTransition, staggerContainer, staggerChild } from "@/lib/animations";
import type { WishlistItem } from "@shared/schema";
import {
  ShoppingCart, Plus, Trash2, X, ExternalLink, Search, Loader2,
  Package, Sparkles, Image as ImageIcon, Link as LinkIcon, Tag,
} from "lucide-react";

/* ─── categories ──────────────────────────────────────── */
const CATEGORIES = [
  { id: "all",         label: "ALL" },
  { id: "electronics", label: "ELECTRONICS" },
  { id: "clothing",    label: "CLOTHING" },
  { id: "books",       label: "BOOKS" },
  { id: "fitness",     label: "FITNESS" },
  { id: "gaming",      label: "GAMING" },
  { id: "home",        label: "HOME" },
  { id: "food",        label: "FOOD" },
  { id: "beauty",      label: "BEAUTY" },
  { id: "other",       label: "OTHER" },
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  electronics: { bg: "rgba(99,102,241,0.12)",  border: "rgba(99,102,241,0.4)",  text: "rgba(165,180,252,0.9)" },
  clothing:    { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.4)",  text: "rgba(216,180,254,0.9)" },
  books:       { bg: "rgba(234,179,8,0.12)",   border: "rgba(234,179,8,0.4)",   text: "rgba(253,224,71,0.9)"  },
  fitness:     { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   text: "rgba(248,113,113,0.9)" },
  gaming:      { bg: "rgba(34,197,94,0.12)",   border: "rgba(34,197,94,0.4)",   text: "rgba(134,239,172,0.9)" },
  home:        { bg: "rgba(249,115,22,0.12)",  border: "rgba(249,115,22,0.4)",  text: "rgba(253,186,116,0.9)" },
  food:        { bg: "rgba(236,72,153,0.12)",  border: "rgba(236,72,153,0.4)",  text: "rgba(244,114,182,0.9)" },
  beauty:      { bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.4)", text: "rgba(251,182,206,0.9)" },
  other:       { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.4)", text: "rgba(148,163,184,0.85)" },
};

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

/* ─── add item dialog ─────────────────────────────────── */
function AddItemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [fetched, setFetched] = useState<{
    title: string; price: string; imageUrl: string;
    asin: string; productUrl: string; success?: boolean; message?: string | null;
  } | null>(null);
  const [category, setCategory] = useState("other");
  const [notes, setNotes] = useState("");

  const fetchMutation = useMutation({
    mutationFn: async (productUrl: string) => {
      const res = await apiRequest("POST", "/api/wishlist/fetch-product", { url: productUrl });
      return res.json();
    },
    onSuccess: (data) => {
      setFetched(data);
      if (!data.success && data.message) {
        toast({ title: "Partial fetch", description: data.message });
      }
    },
    onError: (err: any) => {
      toast({ title: "Fetch failed", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fetched) throw new Error("No product loaded");
      if (!fetched.title.trim()) throw new Error("Please enter a product title");
      const res = await apiRequest("POST", "/api/wishlist", {
        title: fetched.title.trim(),
        price: fetched.price.trim() || null,
        imageUrl: fetched.imageUrl.trim() || null,
        productUrl: fetched.productUrl,
        asin: fetched.asin || null,
        category,
        notes: notes.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({ title: "◈ ADDED TO WISHLIST", description: "Item saved successfully." });
      handleClose();
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setUrl(""); setFetched(null); setCategory("other"); setNotes("");
    onClose();
  };

  const handleFetch = () => {
    if (!url.trim()) return;
    fetchMutation.mutate(url.trim());
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto scrollbar-app"
        style={{
          background: "rgba(6,10,26,0.98)",
          border: "1px solid rgba(99,102,241,0.35)",
          borderRadius: "4px",
          boxShadow: "0 0 60px rgba(99,102,241,0.15)",
        }}
      >
        <Brackets />

        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="hud-label mb-1">◈ ADD TO WISHLIST</div>
            <div style={{ color: "rgba(199,210,254,0.9)", fontSize: "1rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
              Amazon Product
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center transition-all duration-200"
            style={{ border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px", color: "rgba(100,116,139,0.7)", background: "rgba(10,14,30,0.7)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* URL input */}
        <div className="mb-4">
          <div className="hud-label mb-1.5">AMAZON.IN PRODUCT URL</div>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.amazon.in/dp/..."
              data-testid="input-amazon-url"
              className="flex-1 px-3 py-2.5 outline-none transition-all duration-200"
              style={{
                background: "rgba(10,14,30,0.8)",
                border: "1px solid rgba(30,35,60,0.7)",
                borderRadius: "3px",
                color: "rgba(199,210,254,0.9)",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
              }}
            />
            <button
              onClick={handleFetch}
              disabled={!url.trim() || fetchMutation.isPending}
              data-testid="button-fetch-product"
              className="px-4 flex items-center gap-2 font-bold transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.05em",
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.5)",
                borderRadius: "3px",
                color: "rgba(165,180,252,0.95)",
              }}
            >
              {fetchMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              FETCH
            </button>
          </div>
          <p style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.7rem", marginTop: "6px" }}>
            Paste any Amazon India product link. We'll auto-extract title, price, and image.
          </p>
        </div>

        {/* Preview / manual entry */}
        <AnimatePresence>
          {fetched && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 mb-4">
                {/* Image preview */}
                <div className="flex gap-3">
                  <div
                    className="flex-shrink-0 w-24 h-24 flex items-center justify-center overflow-hidden"
                    style={{ background: "rgba(10,14,30,0.8)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "3px" }}
                  >
                    {fetched.imageUrl ? (
                      <img src={fetched.imageUrl} alt="" className="w-full h-full object-contain" onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}/>
                    ) : (
                      <ImageIcon className="w-8 h-8" style={{ color: "rgba(100,116,139,0.4)" }} />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={fetched.title}
                      onChange={(e) => setFetched({ ...fetched, title: e.target.value })}
                      placeholder="Product title"
                      className="w-full px-2.5 py-2 outline-none"
                      style={{
                        background: "rgba(10,14,30,0.8)",
                        border: `1px solid ${fetched.title ? "rgba(30,35,60,0.7)" : "rgba(239,68,68,0.4)"}`,
                        borderRadius: "3px",
                        color: "rgba(199,210,254,0.9)",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                    <input
                      value={fetched.price}
                      onChange={(e) => setFetched({ ...fetched, price: e.target.value })}
                      placeholder="₹ Price (optional)"
                      className="w-full px-2.5 py-2 outline-none"
                      style={{
                        background: "rgba(10,14,30,0.8)",
                        border: "1px solid rgba(30,35,60,0.7)",
                        borderRadius: "3px",
                        color: "rgba(165,180,252,0.85)",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                </div>

                {/* Image URL override */}
                <div>
                  <div className="hud-label mb-1.5">IMAGE URL (OPTIONAL)</div>
                  <input
                    value={fetched.imageUrl}
                    onChange={(e) => setFetched({ ...fetched, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-2.5 py-2 outline-none"
                    style={{
                      background: "rgba(10,14,30,0.8)",
                      border: "1px solid rgba(30,35,60,0.7)",
                      borderRadius: "3px",
                      color: "rgba(148,163,184,0.8)",
                      fontSize: "0.72rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>

                {/* Category */}
                <div>
                  <div className="hud-label mb-2">CATEGORY</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.filter(c => c.id !== "all").map((c) => {
                      const sel = category === c.id;
                      const col = CATEGORY_COLORS[c.id];
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCategory(c.id)}
                          className="px-2.5 py-1.5 transition-all duration-200"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.6rem",
                            letterSpacing: "0.05em",
                            fontWeight: 700,
                            background: sel ? col.bg : "rgba(10,14,30,0.7)",
                            border: `1px solid ${sel ? col.border : "rgba(30,35,60,0.5)"}`,
                            borderRadius: "3px",
                            color: sel ? col.text : "rgba(100,116,139,0.6)",
                          }}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="hud-label mb-1.5">NOTES (OPTIONAL)</div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why do you want this?"
                    rows={2}
                    className="w-full px-2.5 py-2 outline-none resize-none"
                    style={{
                      background: "rgba(10,14,30,0.8)",
                      border: "1px solid rgba(30,35,60,0.7)",
                      borderRadius: "3px",
                      color: "rgba(165,180,252,0.85)",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => saveMutation.mutate()}
                disabled={!fetched.title.trim() || saveMutation.isPending}
                data-testid="button-save-wishlist-item"
                className="w-full flex items-center justify-center gap-2 py-3 font-black tracking-widest uppercase transition-all duration-200"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid rgba(34,197,94,0.5)",
                  borderRadius: "3px",
                  color: "rgba(134,239,172,0.95)",
                  boxShadow: "0 0 14px rgba(34,197,94,0.1)",
                }}
              >
                {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> SAVING...</> : <><Plus className="w-4 h-4" /> SAVE TO WISHLIST</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ─── main component ──────────────────────────────────── */
export default function Wishlist() {
  const { data: items = [], isLoading } = useQuery<WishlistItem[]>({ queryKey: ["/api/wishlist"] });
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/wishlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({ title: "Item removed" });
    },
  });

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      activeCategory === "all" || item.category === activeCategory,
    );
  }, [items, activeCategory]);

  const totalItems = items.length;
  const totalValue = useMemo(() => {
    let sum = 0;
    items.forEach((item) => {
      const m = item.price?.match(/[\d,]+\.?\d*/);
      if (m) sum += parseFloat(m[0].replace(/,/g, ""));
    });
    return sum;
  }, [items]);

  const openAmazonSearch = () => {
    const q = searchTerm.trim();
    const url = q
      ? `https://www.amazon.in/s?k=${encodeURIComponent(q)}`
      : "https://www.amazon.in";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = (id: number) => {
    if (deleteConfirm === id) {
      deleteMutation.mutate(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 2500);
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────── */}
      <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={fadeTransition}>
        <div className="hud-label mb-1">◈ AMAZON.IN WISHLIST MODULE</div>
        <h1 className="text-3xl font-black tracking-widest uppercase"
          style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}>
          Amazon Wishlist
        </h1>
        <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: "4px" }}>
          Save products from the full Amazon India catalog. Real items, real ₹ prices.
        </p>
      </motion.div>

      <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4), transparent)" }} />

      {/* ── Stats row ──────────────────────────────── */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "TOTAL ITEMS", value: totalItems.toString(), icon: Package, color: "rgba(99,102,241,0.85)" },
          { label: "ESTIMATED ₹", value: totalValue > 0 ? `₹${totalValue.toLocaleString("en-IN")}` : "—", icon: Tag, color: "rgba(234,179,8,0.85)" },
          { label: "CATEGORY", value: CATEGORIES.find(c => c.id === activeCategory)?.label ?? "ALL", icon: Sparkles, color: "rgba(168,85,247,0.85)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} variants={staggerChild}
            className="relative p-4 flex items-center gap-3"
            style={{ background: "rgba(6,10,26,0.85)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "4px" }}>
            <div className="w-10 h-10 flex items-center justify-center"
              style={{ background: `${color.replace("0.85", "0.1")}`, border: `1px solid ${color.replace("0.85", "0.3")}`, borderRadius: "3px" }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <div className="font-black tabular-nums truncate" style={{ fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: "rgba(199,210,254,0.95)" }}>
                {value}
              </div>
              <div className="hud-label" style={{ fontSize: "0.55rem", color: "rgba(100,116,139,0.55)" }}>
                {label}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Action bar (search + add) ──────────────── */}
      <motion.div variants={fadeUpBlur} initial="hidden" animate="visible" transition={{ ...fadeTransition, delay: 0.1 }}
        className="relative p-4 space-y-3"
        style={{ background: "rgba(6,10,26,0.85)", border: "1px solid rgba(30,35,60,0.6)", borderRadius: "4px" }}>

        <div className="hud-label mb-1">◈ FIND PRODUCTS</div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2"
            style={{ background: "rgba(10,14,30,0.8)", border: "1px solid rgba(30,35,60,0.7)", borderRadius: "3px", padding: "0 12px" }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(100,116,139,0.6)" }} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") openAmazonSearch(); }}
              placeholder="Search Amazon.in (opens in new tab)..."
              data-testid="input-amazon-search"
              className="flex-1 py-2.5 bg-transparent outline-none"
              style={{ color: "rgba(199,210,254,0.9)", fontSize: "0.82rem", fontFamily: "var(--font-mono)" }}
            />
          </div>

          <button
            onClick={openAmazonSearch}
            data-testid="button-browse-amazon"
            className="flex items-center justify-center gap-2 px-4 py-2.5 font-bold transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              letterSpacing: "0.06em",
              background: "rgba(249,115,22,0.12)",
              border: "1px solid rgba(249,115,22,0.45)",
              borderRadius: "3px",
              color: "rgba(253,186,116,0.95)",
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> BROWSE AMAZON.IN
          </button>

          <button
            onClick={() => setDialogOpen(true)}
            data-testid="button-add-wishlist-item"
            className="flex items-center justify-center gap-2 px-4 py-2.5 font-black tracking-widest uppercase transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.72rem",
              background: "rgba(99,102,241,0.18)",
              border: "1px solid rgba(99,102,241,0.5)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.95)",
              boxShadow: "0 0 14px rgba(99,102,241,0.1)",
            }}
          >
            <Plus className="w-3.5 h-3.5" /> ADD ITEM
          </button>
        </div>

        <p style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.7rem" }}>
          1) Browse Amazon.in → 2) Copy product URL → 3) Press <strong style={{ color: "rgba(165,180,252,0.7)" }}>ADD ITEM</strong> and paste it.
        </p>
      </motion.div>

      {/* ── Category filter ────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => {
          const sel = activeCategory === c.id;
          const col = c.id === "all"
            ? { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.5)", text: "rgba(165,180,252,0.9)" }
            : CATEGORY_COLORS[c.id];
          return (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              data-testid={`filter-${c.id}`}
              className="px-3 py-1.5 transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.62rem",
                letterSpacing: "0.06em",
                fontWeight: 700,
                background: sel ? col.bg : "rgba(10,14,30,0.6)",
                border: `1px solid ${sel ? col.border : "rgba(30,35,60,0.5)"}`,
                borderRadius: "3px",
                color: sel ? col.text : "rgba(100,116,139,0.6)",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── Items grid ─────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.5)" }} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="relative flex flex-col items-center justify-center py-16 gap-4 text-center"
          style={{ background: "rgba(6,10,26,0.7)", border: "1px solid rgba(30,35,60,0.5)", borderRadius: "4px" }}
        >
          <div className="w-16 h-16 flex items-center justify-center"
            style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "4px" }}>
            <ShoppingCart className="w-8 h-8" style={{ color: "rgba(99,102,241,0.3)" }} />
          </div>
          <div>
            <div className="hud-label mb-1">WISHLIST EMPTY</div>
            <p style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.78rem" }}>
              {activeCategory === "all"
                ? "Browse Amazon.in and add your first product."
                : "No items in this category yet."}
            </p>
          </div>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence>
            {filteredItems.map((item) => {
              const col = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.other;
              const isDeleting = deleteConfirm === item.id;
              return (
                <motion.div
                  key={item.id}
                  variants={staggerChild}
                  layout
                  exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                  data-testid={`wishlist-item-${item.id}`}
                  className="relative group flex flex-col"
                  style={{
                    background: "rgba(6,10,26,0.9)",
                    border: `1px solid ${isDeleting ? "rgba(239,68,68,0.5)" : col.border}`,
                    borderRadius: "4px",
                    overflow: "hidden",
                    boxShadow: `0 0 14px ${col.bg}`,
                  }}
                >
                  <Brackets color={isDeleting ? "rgba(239,68,68,0.5)" : col.border} />

                  {/* Image */}
                  <div
                    className="aspect-square flex items-center justify-center overflow-hidden"
                    style={{ background: "rgba(10,14,30,0.85)" }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-contain p-3"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <Package className="w-10 h-10" style={{ color: "rgba(100,116,139,0.3)" }} />
                    )}

                    {/* Category badge top-left */}
                    <div
                      className="absolute top-2 left-2 px-2 py-0.5"
                      style={{
                        background: `${col.bg}`,
                        border: `1px solid ${col.border}`,
                        borderRadius: "2px",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.55rem",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                        color: col.text,
                      }}
                    >
                      {item.category.toUpperCase()}
                    </div>

                    {/* Delete button top-right */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      data-testid={`button-delete-wishlist-${item.id}`}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                      style={{
                        background: isDeleting ? "rgba(239,68,68,0.2)" : "rgba(4,7,18,0.85)",
                        border: `1px solid ${isDeleting ? "rgba(239,68,68,0.55)" : "rgba(30,35,60,0.6)"}`,
                        borderRadius: "3px",
                        color: isDeleting ? "rgba(248,113,113,0.9)" : "rgba(148,163,184,0.7)",
                      }}
                    >
                      {isDeleting ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3 flex-1 flex flex-col gap-2">
                    <div
                      className="font-bold leading-tight line-clamp-2"
                      style={{ color: "rgba(199,210,254,0.92)", fontSize: "0.82rem", minHeight: "2.4rem" }}
                    >
                      {item.title}
                    </div>

                    {item.price && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3" style={{ color: "rgba(234,179,8,0.7)" }} />
                        <span
                          className="font-black tabular-nums"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "1rem",
                            color: "rgba(253,224,71,0.95)",
                          }}
                        >
                          {item.price}
                        </span>
                      </div>
                    )}

                    {item.notes && (
                      <p
                        className="line-clamp-2"
                        style={{ color: "rgba(100,116,139,0.65)", fontSize: "0.7rem", lineHeight: 1.4 }}
                      >
                        {item.notes}
                      </p>
                    )}

                    {isDeleting && (
                      <div className="hud-label" style={{ color: "rgba(248,113,113,0.7)", fontSize: "0.55rem" }}>
                        CLICK ✕ AGAIN TO DELETE
                      </div>
                    )}

                    <a
                      href={item.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`link-amazon-${item.id}`}
                      className="mt-auto flex items-center justify-center gap-1.5 py-2 font-bold transition-all duration-200"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        letterSpacing: "0.06em",
                        background: "rgba(249,115,22,0.1)",
                        border: "1px solid rgba(249,115,22,0.35)",
                        borderRadius: "3px",
                        color: "rgba(253,186,116,0.85)",
                      }}
                    >
                      <ExternalLink className="w-3 h-3" /> VIEW ON AMAZON
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Dialog ─────────────────────────────────── */}
      <AnimatePresence>
        {dialogOpen && <AddItemDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
