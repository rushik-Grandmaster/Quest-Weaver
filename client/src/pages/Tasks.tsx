import { useState } from "react";
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from "@/hooks/use-tasks";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema, type InsertTask } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Filter, Trash2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSound } from "@/hooks/use-sound";

export default function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const { mutate: deleteTask } = useDeleteTask();
  const { mutate: completeTask } = useCompleteTask();
  const { playSound } = useSound();
  const [filter, setFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleComplete = (id: number) => {
    playSound("task");
    completeTask(id);
  };

  const filteredTasks = tasks?.filter(task => {
    if (filter === "all") return !task.isCompleted;
    if (filter === "completed") return task.isCompleted;
    return task.category === filter && !task.isCompleted;
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display">Quest Board</h1>
          <p className="text-muted-foreground mt-1">Manage your active missions and daily habits.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active Quests</SelectItem>
              <SelectItem value="daily">Dailies</SelectItem>
              <SelectItem value="habit">Habits</SelectItem>
              <SelectItem value="one_time">One-time</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <CreateTaskDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTasks?.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`
                group relative bg-card rounded-2xl p-6 border transition-all duration-300
                ${task.isCompleted ? "border-border opacity-60" : "border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"}
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`
                  px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                  ${task.difficulty === 'hard' ? 'bg-red-500/10 text-red-500' : 
                    task.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}
                `}>
                  {task.difficulty}
                </span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded capitalize">
                  {task.category.replace('_', ' ')}
                </span>
              </div>

              <h3 className={`font-bold text-lg mb-2 ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px]">
                {task.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col text-xs font-medium gap-1">
                  <span className="text-accent">+{task.rewardXp} XP</span>
                  <span className="text-yellow-500">+{task.rewardPoints} Gold</span>
                </div>

                <div className="flex gap-2">
                  {!task.isCompleted && (
                    <Button 
                      size="sm" 
                      onClick={() => handleComplete(task.id)}
                      className="bg-primary hover:bg-primary/90 text-white rounded-lg shadow-lg shadow-primary/20"
                    >
                      Complete
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTasks?.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold mb-2">No quests found</h3>
          <p className="text-muted-foreground">Adjust your filters or create a new quest to begin.</p>
        </div>
      )}
    </div>
  );
}

function CreateTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createTask, isPending } = useCreateTask();
  const { toast } = useToast();
  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "one_time",
      difficulty: "easy",
      rewardXp: 10,
      rewardPoints: 5,
    }
  });

  const onSubmit = (data: InsertTask) => {
    createTask(data, {
      onSuccess: () => {
        toast({
          title: "Quest Created!",
          description: "Your new quest has been added to the board.",
          variant: "default"
        });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Failed to create quest",
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
          <Plus className="w-4 h-4 mr-2" /> New Quest
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Quest</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input {...form.register("title")} placeholder="E.g., Read 10 pages" />
            {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea {...form.register("description")} placeholder="Details about this quest..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select onValueChange={(val) => form.setValue("category", val as any)} defaultValue="one_time">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="habit">Habit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select onValueChange={(val) => {
                form.setValue("difficulty", val as any);
                // Auto-adjust rewards based on difficulty
                if (val === "easy") { form.setValue("rewardXp", 10); form.setValue("rewardPoints", 5); }
                if (val === "medium") { form.setValue("rewardXp", 25); form.setValue("rewardPoints", 15); }
                if (val === "hard") { form.setValue("rewardXp", 50); form.setValue("rewardPoints", 30); }
              }} defaultValue="easy">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">XP Reward</label>
              <Input 
                type="number"
                {...form.register("rewardXp", { valueAsNumber: true })} 
                placeholder="10"
              />
              {form.formState.errors.rewardXp && <p className="text-xs text-destructive">{form.formState.errors.rewardXp.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gold Reward</label>
              <Input 
                type="number"
                {...form.register("rewardPoints", { valueAsNumber: true })} 
                placeholder="5"
              />
              {form.formState.errors.rewardPoints && <p className="text-xs text-destructive">{form.formState.errors.rewardPoints.message}</p>}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create Quest"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
