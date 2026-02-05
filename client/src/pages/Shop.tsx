import { useState } from "react";
import { useShopItems, useBuyItem, useCreateShopItem } from "@/hooks/use-shop";
import { useUserStats } from "@/hooks/use-gamification";
import { Loader2, ShoppingBag, Lock, Gift, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShopItemSchema, type InsertShopItem } from "@shared/schema";
import { useSound } from "@/hooks/use-sound";

export default function Shop() {
  const { data: items, isLoading } = useShopItems();
  const { data: stats } = useUserStats();
  const { mutate: buyItem, isPending: isBuying } = useBuyItem();
  const { toast } = useToast();
  const { playSound } = useSound();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleBuy = (item: any) => {
    if (!stats || stats.points < item.cost) {
      toast({
        title: "Insufficient Funds",
        description: "You need more gold to purchase this item.",
        variant: "destructive",
      });
      return;
    }
    playSound("gold");
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 font-bold">
            <ShoppingBag className="w-5 h-5" />
            <span>{stats?.points || 0} Gold Available</span>
          </div>
          <CreateItemDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
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

function CreateItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createItem, isPending } = useCreateShopItem();
  const { toast } = useToast();
  const form = useForm<InsertShopItem>({
    resolver: zodResolver(insertShopItemSchema),
    defaultValues: {
      name: "",
      description: "",
      cost: 100,
      category: "custom",
      icon: "gift",
    }
  });

  const onSubmit = (data: InsertShopItem) => {
    createItem(data, {
      onSuccess: () => {
        toast({
          title: "Item Created!",
          description: "Your custom reward has been added to the shop.",
          variant: "default"
        });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Failed to create item",
          description: error.message || "Something went wrong",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Custom Reward</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Item Name</label>
            <Input {...form.register("name")} placeholder="E.g., Coffee Break" />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea {...form.register("description")} placeholder="What is this reward for?" />
            {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost (Gold)</label>
              <Input 
                type="number"
                {...form.register("cost", { valueAsNumber: true })} 
                placeholder="100"
              />
              {form.formState.errors.cost && <p className="text-xs text-destructive">{form.formState.errors.cost.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <Select onValueChange={(val) => form.setValue("icon", val)} defaultValue="gift">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift">Gift</SelectItem>
                  <SelectItem value="star">Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create Reward"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
