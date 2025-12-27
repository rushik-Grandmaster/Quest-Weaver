import { useInventory } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, PackageX, Calendar, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function UsedItems() {
  const { data: inventory, isLoading } = useInventory();
  const [, navigate] = useLocation();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  const usedItems = inventory?.filter(i => i.isUsed) || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/inventory")}
          data-testid="button-back-to-inventory"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold font-display">Used Items History</h1>
          <p className="text-muted-foreground mt-1">Items you've used from your collection.</p>
        </div>
      </div>

      {usedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <PackageX className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No used items yet</h3>
          <p className="text-muted-foreground">Items you use will appear here for history tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usedItems.map(({ inventoryId, item, usedAt }, index) => (
            <motion.div
              key={inventoryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              data-testid={`card-used-item-${inventoryId}`}
              className="bg-card rounded-2xl p-6 border border-border/50 opacity-75"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center text-2xl flex-shrink-0 opacity-50">
                  {item.icon === 'gift' ? '🎁' : item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg line-through">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Used {format(new Date(usedAt!), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
