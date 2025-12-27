import { useInventory, useUseInventoryItem, useDeleteInventoryItem } from "@/hooks/use-shop";
import { useLocation } from "wouter";
import { Loader2, PackageOpen, Calendar, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const { data: inventory, isLoading } = useInventory();
  const { mutate: useItem, isPending: isUsing } = useUseInventoryItem();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteInventoryItem();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  const activeItems = inventory?.filter(i => !i.isUsed) || [];
  const usedItems = inventory?.filter(i => i.isUsed) || [];

  const handleUseItem = (id: number) => {
    useItem(id, {
      onSuccess: () => {
        toast({
          title: "Item Used!",
          description: "Check your Used Items page to see it in your history.",
          variant: "default"
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to use item",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleDeleteItem = (id: number) => {
    deleteItem(id, {
      onSuccess: () => {
        toast({
          title: "Item Deleted",
          description: "Item has been permanently removed.",
          variant: "default"
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete item",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display">Inventory</h1>
          <p className="text-muted-foreground mt-1">Your collection of purchased rewards.</p>
        </div>
        {usedItems.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => navigate("/used-items")}
            data-testid="button-view-used-items"
          >
            Used Items ({usedItems.length})
          </Button>
        )}
      </div>

      {activeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
            <PackageOpen className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No active items</h3>
          <p className="text-muted-foreground">Visit the shop to spend your gold!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeItems.map(({ inventoryId, item, acquiredAt }, index) => (
            <motion.div
              key={inventoryId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              data-testid={`card-inventory-${inventoryId}`}
              className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  {item.icon === 'gift' ? '🎁' : item.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <Calendar className="w-3 h-3" />
                {format(new Date(acquiredAt), "MMM d, yyyy")}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseItem(inventoryId)}
                  disabled={isUsing}
                  data-testid={`button-use-item-${inventoryId}`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isUsing ? "Using..." : "Use"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteItem(inventoryId)}
                  disabled={isDeleting}
                  data-testid={`button-delete-item-${inventoryId}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
