import { useShopItems, useBuyItem } from "@/hooks/use-shop";
import { useUserStats } from "@/hooks/use-gamification";
import { Loader2, ShoppingBag, Lock, Gift, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Shop() {
  const { data: items, isLoading } = useShopItems();
  const { data: stats } = useUserStats();
  const { mutate: buyItem, isPending: isBuying } = useBuyItem();
  const { toast } = useToast();

  const handleBuy = (item: any) => {
    if (!stats || stats.points < item.cost) {
      toast({
        title: "Insufficient Funds",
        description: "You need more gold to purchase this item.",
        variant: "destructive",
      });
      return;
    }
    buyItem(item.id);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Item Shop</h1>
          <p className="text-muted-foreground mt-1">Spend your hard-earned gold on rewards.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 font-bold">
          <ShoppingBag className="w-5 h-5" />
          <span>{stats?.points || 0} Gold Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items?.map((item) => {
          const canAfford = (stats?.points || 0) >= item.cost;
          
          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -5 }}
              className="bg-card rounded-2xl p-6 border border-border flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">
                {item.icon === 'gift' ? <Gift className="w-10 h-10 text-primary" /> : <Star className="w-10 h-10 text-yellow-500" />}
              </div>
              
              <h3 className="font-bold text-lg mb-2">{item.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{item.description}</p>
              
              <div className="mt-auto w-full">
                <Button 
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || isBuying}
                  className={`w-full font-bold ${canAfford ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
                >
                  {!canAfford && <Lock className="w-4 h-4 mr-2" />}
                  {item.cost} Gold
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
