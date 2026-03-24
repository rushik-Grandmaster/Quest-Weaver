import { useState } from "react";
import { useShopItems, useBuyItem, useCreateShopItem } from "@/hooks/use-shop";
import { useUserStats } from "@/hooks/use-gamification";
import { Loader2, Lock, Plus, Coins, ShoppingBag, Sparkles, Gift, Star, Package, Zap, Coffee, Gamepad2, Music, Book, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShopItemSchema, type InsertShopItem } from "@shared/schema";
import { useSound } from "@/hooks/use-sound";

const ICON_MAP: Record<string, React.ReactNode> = {
  gift:     <Gift className="w-8 h-8" />,
  star:     <Star className="w-8 h-8" />,
  zap:      <Zap className="w-8 h-8" />,
  coffee:   <Coffee className="w-8 h-8" />,
  game:     <Gamepad2 className="w-8 h-8" />,
  music:    <Music className="w-8 h-8" />,
  book:     <Book className="w-8 h-8" />,
  shirt:    <Shirt className="w-8 h-8" />,
  package:  <Package className="w-8 h-8" />,
  sparkles: <Sparkles className="w-8 h-8" />,
};

function getItemColor(cost: number) {
  if (cost >= 1000) return { color: "#f59e0b", glow: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.4)", label: "LEGENDARY" };
  if (cost >= 500)  return { color: "#a78bfa", glow: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)", label: "EPIC" };
  if (cost >= 200)  return { color: "#60a5fa", glow: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)", label: "RARE" };
  return { color: "#4ade80", glow: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", label: "COMMON" };
}

function ShopItemCard({ item, canAfford, onBuy, isBuying }: {
  item: any; canAfford: boolean; onBuy: () => void; isBuying: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [justBought, setJustBought] = useState(false);
  const rarity = getItemColor(item.cost);

  const handleBuy = () => {
    if (!canAfford || isBuying) return;
    setJustBought(true);
    setTimeout(() => setJustBought(false), 1500);
    onBuy();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col"
      style={{
        background: hovered && canAfford
          ? `linear-gradient(135deg, ${rarity.glow} 0%, rgba(4,7,18,0.98) 60%)`
          : "rgba(6,10,26,0.9)",
        border: `1px solid ${hovered && canAfford ? rarity.border : canAfford ? rarity.border + "55" : "rgba(30,35,60,0.6)"}`,
        borderRadius: "4px",
        boxShadow: hovered && canAfford ? `0 0 24px ${rarity.glow}` : "none",
        transition: "all 0.25s ease",
        opacity: canAfford ? 1 : 0.55,
      }}
    >
      {/* Corner brackets on hover */}
      {hovered && canAfford && (
        <>
          <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: rarity.color }} />
        </>
      )}

      <div className="p-5 flex flex-col items-center text-center flex-1">
        {/* Rarity badge */}
        <div className="self-end mb-2">
          <span
            className="hud-label px-2 py-0.5"
            style={{
              background: `${rarity.color}15`,
              border: `1px solid ${rarity.color}33`,
              color: rarity.color,
              borderRadius: "3px",
              fontSize: "0.5rem",
            }}
          >
            {rarity.label}
          </span>
        </div>

        {/* Icon */}
        <div
          className="w-20 h-20 flex items-center justify-center mb-4 flex-shrink-0"
          style={{
            background: canAfford ? `${rarity.glow}` : "rgba(15,20,40,0.6)",
            border: `1px solid ${canAfford ? rarity.border : "rgba(30,35,60,0.5)"}`,
            borderRadius: "4px",
            color: canAfford ? rarity.color : "rgba(50,60,90,0.7)",
            boxShadow: hovered && canAfford ? `0 0 16px ${rarity.glow}` : "none",
            transition: "all 0.25s ease",
          }}
        >
          {ICON_MAP[item.icon] ?? <Gift className="w-8 h-8" />}
        </div>

        <h3
          className="font-bold mb-1"
          style={{ color: canAfford ? "rgba(199,210,254,0.95)" : "rgba(70,85,120,0.8)", fontSize: "0.95rem" }}
        >
          {item.name}
        </h3>
        <p className="text-xs mb-5 flex-1" style={{ color: "rgba(100,116,139,0.75)", lineHeight: 1.5 }}>
          {item.description}
        </p>

        {/* Buy button */}
        <button
          onClick={handleBuy}
          disabled={!canAfford || isBuying}
          data-testid={`button-buy-${item.id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 font-bold transition-all duration-200"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            letterSpacing: "0.08em",
            borderRadius: "3px",
            background: justBought
              ? "rgba(74,222,128,0.15)"
              : canAfford
              ? hovered ? `${rarity.color}22` : "rgba(15,20,40,0.8)"
              : "rgba(15,20,40,0.5)",
            border: justBought
              ? "1px solid rgba(74,222,128,0.5)"
              : canAfford
              ? `1px solid ${hovered ? rarity.border : rarity.border + "55"}`
              : "1px solid rgba(30,35,60,0.5)",
            color: justBought
              ? "rgba(74,222,128,0.9)"
              : canAfford
              ? hovered ? rarity.color : "rgba(148,163,184,0.8)"
              : "rgba(50,60,90,0.7)",
            cursor: canAfford ? "pointer" : "not-allowed",
          }}
        >
          {!canAfford && <Lock className="w-3 h-3" />}
          <Coins className="w-3.5 h-3.5" />
          {justBought ? "PURCHASED" : `${item.cost} GOLD`}
        </button>
      </div>
    </motion.div>
  );
}

export default function Shop() {
  const { data: items, isLoading } = useShopItems();
  const { data: stats } = useUserStats();
  const { mutate: buyItem, isPending: isBuying } = useBuyItem();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleBuy = (item: any) => {
    if (!stats || stats.points < item.cost) {
      toast({ title: "Insufficient Funds", description: "You need more gold.", variant: "destructive" });
      return;
    }
    playSound("gold");
    buyItem(item.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const gold = stats?.points ?? 0;

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="hud-label mb-1">◈ SHADOW MARKET</div>
          <h1
            className="text-3xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
          >
            Item Shop
          </h1>
          <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: "4px" }}>
            Redeem your hard-earned gold for real-life rewards.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Gold balance */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "4px",
            }}
          >
            <Coins className="w-5 h-5" style={{ color: "rgba(245,158,11,0.9)" }} />
            <div>
              <div className="hud-label" style={{ color: "rgba(245,158,11,0.6)", fontSize: "0.5rem" }}>GOLD BALANCE</div>
              <span
                className="font-black text-xl"
                style={{ fontFamily: "var(--font-mono)", color: "rgba(245,158,11,1)" }}
              >
                {gold.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add item button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            data-testid="button-create-item"
            className="flex items-center gap-2 px-4 py-3 font-bold transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.35)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.9)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.18)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(99,102,241,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <Plus className="w-4 h-4" />
            ADD REWARD
          </button>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1), transparent)" }} />

      {/* Items grid */}
      {items && items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center"
          style={{ border: "1px dashed rgba(99,102,241,0.2)", borderRadius: "4px" }}
        >
          <ShoppingBag className="w-10 h-10 mb-4" style={{ color: "rgba(99,102,241,0.3)" }} />
          <div className="hud-label mb-2">NO ITEMS AVAILABLE</div>
          <p style={{ color: "rgba(100,116,139,0.6)", fontSize: "0.8rem" }}>Add your first custom reward to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items?.map((item, i) => {
            const canAfford = gold >= item.cost;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <ShopItemCard
                  item={item}
                  canAfford={canAfford}
                  onBuy={() => handleBuy(item)}
                  isBuying={isBuying}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <CreateItemDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}

function CreateItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createItem, isPending } = useCreateShopItem();
  const { toast } = useToast();
  const form = useForm<InsertShopItem>({
    resolver: zodResolver(insertShopItemSchema),
    defaultValues: { name: "", description: "", cost: 100, category: "custom", icon: "gift" },
  });

  const onSubmit = (data: InsertShopItem) => {
    createItem(data, {
      onSuccess: () => {
        toast({ title: "Reward Created", description: "Your custom reward is now in the shop." });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({ title: "Failed to create item", description: error.message || "Something went wrong", variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px]"
        style={{
          background: "rgba(4,7,18,0.98)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "4px",
          boxShadow: "0 0 40px rgba(99,102,241,0.15)",
        }}
      >
        <DialogHeader>
          <div className="hud-label mb-1">◈ SYSTEM REGISTER</div>
          <DialogTitle
            className="text-xl font-black tracking-wider uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
          >
            Create Custom Reward
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Field label="REWARD NAME" error={form.formState.errors.name?.message}>
            <Input
              {...form.register("name")}
              placeholder="e.g., Movie Night"
              data-testid="input-item-name"
              style={inputStyle}
            />
          </Field>

          <Field label="DESCRIPTION" error={form.formState.errors.description?.message}>
            <Textarea
              {...form.register("description")}
              placeholder="What does this reward unlock?"
              rows={2}
              data-testid="input-item-description"
              style={{ ...inputStyle, resize: "none" }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="GOLD COST" error={form.formState.errors.cost?.message}>
              <Input
                type="number"
                {...form.register("cost", { valueAsNumber: true })}
                placeholder="100"
                data-testid="input-item-cost"
                style={inputStyle}
              />
            </Field>

            <Field label="ICON">
              <Select onValueChange={val => form.setValue("icon", val)} defaultValue="gift">
                <SelectTrigger style={inputStyle} data-testid="select-item-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ background: "rgba(6,10,26,0.98)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  {["gift", "star", "zap", "coffee", "game", "music", "book", "shirt", "package", "sparkles"].map(v => (
                    <SelectItem key={v} value={v} style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                      {v.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-create-item"
            className="w-full py-3 font-bold tracking-widest transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              background: isPending ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.9)",
            }}
          >
            {isPending ? "REGISTERING..." : "◈ REGISTER REWARD"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="hud-label">{label}</label>
      {children}
      {error && <p className="text-xs" style={{ color: "rgba(239,68,68,0.8)" }}>{error}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(6,10,26,0.8)",
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: "3px",
  color: "rgba(199,210,254,0.9)",
  fontFamily: "var(--font-mono)",
  fontSize: "0.82rem",
};
