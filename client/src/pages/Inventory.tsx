import { useInventory } from "@/hooks/use-shop";
import { Loader2, PackageOpen, Calendar } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function Inventory() {
  const { data: inventory, isLoading } = useInventory();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Inventory</h1>
        <p className="text-muted-foreground mt-1">Your collection of purchased rewards.</p>
      </div>

      {inventory?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <PackageOpen className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">Inventory is empty</h3>
          <p className="text-muted-foreground">Visit the shop to spend your gold!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory?.map(({ inventoryId, item, acquiredAt }) => (
            <motion.div
              key={inventoryId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card rounded-2xl p-6 border border-border flex items-start gap-4"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                🎁
              </div>
              <div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Acquired {format(new Date(acquiredAt), "MMM d, yyyy")}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
