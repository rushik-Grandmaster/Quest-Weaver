import { useInventory, useUseInventoryItem, useDeleteInventoryItem } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, PackageOpen, Calendar, Check, Trash2, Backpack, History } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Gift, Star, Zap, Coffee, Gamepad2, Music, Book, Shirt, Package, Sparkles } from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ReactNode> = {
  gift:     <Gift className="w-7 h-7" />,
  star:     <Star className="w-7 h-7" />,
  zap:      <Zap className="w-7 h-7" />,
  coffee:   <Coffee className="w-7 h-7" />,
  game:     <Gamepad2 className="w-7 h-7" />,
  music:    <Music className="w-7 h-7" />,
  book:     <Book className="w-7 h-7" />,
  shirt:    <Shirt className="w-7 h-7" />,
  package:  <Package className="w-7 h-7" />,
  sparkles: <Sparkles className="w-7 h-7" />,
};

function getItemColor(cost: number) {
  if (cost >= 1000) return { color: "#f59e0b", glow: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", label: "LEGENDARY" };
  if (cost >= 500)  return { color: "#a78bfa", glow: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.3)", label: "EPIC" };
  if (cost >= 200)  return { color: "#60a5fa", glow: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", label: "RARE" };
  return { color: "#4ade80", glow: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.22)", label: "COMMON" };
}

function InventoryCard({
  inventoryId, item, acquiredAt, onUse, onDelete, isUsing, isDeleting, index,
}: {
  inventoryId: number; item: any; acquiredAt: string | Date;
  onUse: () => void; onDelete: () => void;
  isUsing: boolean; isDeleting: boolean; index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rarity = getItemColor(item.cost);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      data-testid={`card-inventory-${inventoryId}`}
      className="relative flex flex-col"
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${rarity.glow} 0%, rgba(4,7,18,0.98) 60%)`
          : "rgba(6,10,26,0.9)",
        border: `1px solid ${hovered ? rarity.border : rarity.border + "55"}`,
        borderRadius: "4px",
        boxShadow: hovered ? `0 0 20px ${rarity.glow}` : "none",
        transition: "all 0.22s ease",
      }}
    >
      {/* Corner brackets */}
      {hovered && (
        <>
          <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2" style={{ borderColor: rarity.color }} />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2" style={{ borderColor: rarity.color }} />
        </>
      )}

      <div className="p-5">
        {/* Top row: icon + info */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="flex-shrink-0 w-14 h-14 flex items-center justify-center"
            style={{
              background: rarity.glow,
              border: `1px solid ${rarity.border}`,
              borderRadius: "4px",
              color: rarity.color,
              boxShadow: hovered ? `0 0 14px ${rarity.glow}` : "none",
              transition: "all 0.22s ease",
            }}
          >
            {ICON_MAP[item.icon] ?? <Gift className="w-7 h-7" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <h3
                className="font-bold truncate"
                style={{ color: "rgba(199,210,254,0.95)", fontSize: "0.95rem" }}
              >
                {item.name}
              </h3>
              <span
                className="hud-label flex-shrink-0 px-1.5 py-0.5"
                style={{
                  background: `${rarity.color}12`,
                  border: `1px solid ${rarity.color}30`,
                  color: rarity.color,
                  borderRadius: "2px",
                  fontSize: "0.48rem",
                }}
              >
                {rarity.label}
              </span>
            </div>
            <p style={{ color: "rgba(100,116,139,0.75)", fontSize: "0.75rem", lineHeight: 1.4 }}>
              {item.description}
            </p>
          </div>
        </div>

        {/* Acquired date */}
        <div
          className="flex items-center gap-1.5 mb-4 px-2 py-1.5"
          style={{
            background: "rgba(15,20,40,0.6)",
            border: "1px solid rgba(30,35,60,0.6)",
            borderRadius: "3px",
          }}
        >
          <Calendar className="w-3 h-3" style={{ color: "rgba(99,102,241,0.5)" }} />
          <span className="hud-label" style={{ color: "rgba(99,102,241,0.6)" }}>ACQUIRED</span>
          <span
            className="ml-auto"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "rgba(148,163,184,0.7)" }}
          >
            {format(new Date(acquiredAt), "MMM d, yyyy")}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onUse}
            disabled={isUsing}
            data-testid={`button-use-item-${inventoryId}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 font-bold transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.73rem",
              letterSpacing: "0.06em",
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: "3px",
              color: "rgba(74,222,128,0.9)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(74,222,128,0.18)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 10px rgba(74,222,128,0.15)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(74,222,128,0.1)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <Check className="w-3.5 h-3.5" />
            {isUsing ? "USING..." : "USE ITEM"}
          </button>

          <button
            onClick={() => {
              if (confirmDelete) { onDelete(); setConfirmDelete(false); }
              else setConfirmDelete(true);
            }}
            disabled={isDeleting}
            data-testid={`button-delete-item-${inventoryId}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2 font-bold transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              letterSpacing: "0.04em",
              background: confirmDelete ? "rgba(239,68,68,0.15)" : "rgba(15,20,40,0.6)",
              border: `1px solid ${confirmDelete ? "rgba(239,68,68,0.5)" : "rgba(30,35,60,0.6)"}`,
              borderRadius: "3px",
              color: confirmDelete ? "rgba(239,68,68,0.9)" : "rgba(100,116,139,0.6)",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmDelete && <span>CONFIRM</span>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Inventory() {
  const { data: inventory, isLoading } = useInventory();
  const { mutate: useItem, isPending: isUsing } = useUseInventoryItem();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteInventoryItem();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(99,102,241,0.6)" }} />
      </div>
    );
  }

  const activeItems = inventory?.filter(i => !i.isUsed) ?? [];
  const usedItems   = inventory?.filter(i => i.isUsed) ?? [];

  const handleUse = (id: number) => {
    useItem(id, {
      onSuccess: () => toast({ title: "Item Used!", description: "Moved to used items history." }),
      onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (id: number) => {
    deleteItem(id, {
      onSuccess: () => toast({ title: "Item Removed", description: "Permanently deleted from inventory." }),
      onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="hud-label mb-1">◈ PLAYER STORAGE</div>
          <h1
            className="text-3xl font-black tracking-widest uppercase"
            style={{ fontFamily: "var(--font-display)", color: "rgba(199,210,254,0.95)" }}
          >
            Inventory
          </h1>
          <p style={{ color: "rgba(100,116,139,0.7)", fontSize: "0.78rem", marginTop: "4px" }}>
            Your purchased rewards, ready to be used.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Slot count */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: "4px",
            }}
          >
            <Backpack className="w-4 h-4" style={{ color: "rgba(129,140,248,0.8)" }} />
            <div>
              <div className="hud-label" style={{ fontSize: "0.5rem", color: "rgba(99,102,241,0.5)" }}>ACTIVE ITEMS</div>
              <span style={{ fontFamily: "var(--font-mono)", color: "rgba(165,180,252,0.9)", fontSize: "1rem", fontWeight: 700 }}>
                {activeItems.length}
              </span>
            </div>
          </div>

          {/* Used items button */}
          {usedItems.length > 0 && (
            <button
              onClick={() => navigate("/used-items")}
              data-testid="button-view-used-items"
              className="flex items-center gap-2 px-4 py-2.5 font-bold transition-all duration-200"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.73rem",
                letterSpacing: "0.06em",
                background: "rgba(15,20,40,0.7)",
                border: "1px solid rgba(30,35,60,0.8)",
                borderRadius: "3px",
                color: "rgba(100,116,139,0.8)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "rgba(165,180,252,0.8)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "rgba(100,116,139,0.8)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(30,35,60,0.8)";
              }}
            >
              <History className="w-4 h-4" />
              USED ITEMS ({usedItems.length})
            </button>
          )}
        </div>
      </motion.div>

      {/* Divider */}
      <div className="h-px" style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1), transparent)" }} />

      {/* Items */}
      {activeItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
          style={{ border: "1px dashed rgba(99,102,241,0.18)", borderRadius: "4px" }}
        >
          <div
            className="w-20 h-20 flex items-center justify-center mb-5"
            style={{
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.15)",
              borderRadius: "4px",
            }}
          >
            <PackageOpen className="w-9 h-9" style={{ color: "rgba(99,102,241,0.35)" }} />
          </div>
          <div className="hud-label mb-2">INVENTORY EMPTY</div>
          <p style={{ color: "rgba(100,116,139,0.55)", fontSize: "0.8rem" }}>
            Visit the shop and spend your gold on rewards.
          </p>
          <button
            onClick={() => navigate("/shop")}
            className="mt-6 px-5 py-2.5 font-bold transition-all duration-200"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "3px",
              color: "rgba(165,180,252,0.85)",
            }}
          >
            ◈ VISIT SHOP
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeItems.map(({ inventoryId, item, acquiredAt }, i) => (
            <InventoryCard
              key={inventoryId}
              inventoryId={inventoryId}
              item={item}
              acquiredAt={acquiredAt}
              onUse={() => handleUse(inventoryId)}
              onDelete={() => handleDelete(inventoryId)}
              isUsing={isUsing}
              isDeleting={isDeleting}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
