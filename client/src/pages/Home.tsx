import { useUserStats } from "@/hooks/use-gamification";
import { useTasks, useCompleteTask } from "@/hooks/use-tasks";
import { Loader2, CheckCircle2, Circle, ArrowRight, Sword } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Home() {
  const { data: stats } = useUserStats();
  const { data: tasks, isLoading: isLoadingTasks } = useTasks();
  const { mutate: completeTask, isPending: isCompleting } = useCompleteTask();

  // Filter for 'daily' tasks that aren't completed today
  const dailyQuests = tasks?.filter(t => t.category === 'daily' && !t.isCompleted) || [];

  if (isLoadingTasks) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingTasks = tasks?.filter(t => !t.isCompleted).slice(0, 3) || [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            Command Center
          </h1>
          <Link href="/tasks" className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            View All Quests <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Hero Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-1 md:col-span-2 rounded-3xl p-8 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-900/50 to-background z-0" />
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay" />
            
            {/* Descriptive comment: Abstract tech background for gaming vibe */}

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-md border border-white/10 mb-4">
                <Sword className="w-3 h-3" /> Current Objective
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Level {stats?.level || 1} Warrior
              </h2>
              <p className="text-white/60 mb-6 max-w-md">
                Complete your daily quests to earn XP and gold. Maintain your streak for bonus rewards!
              </p>
              
              <div className="flex gap-4">
                <Link href="/tasks" className="px-6 py-3 rounded-xl bg-white text-primary font-bold hover:bg-white/90 transition-colors shadow-lg shadow-black/20">
                  Start Questing
                </Link>
                <Link href="/shop" className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold backdrop-blur-md hover:bg-white/20 transition-colors border border-white/10">
                  Visit Shop
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel rounded-3xl p-6 flex flex-col justify-center gap-6"
          >
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Today's XP Earned</p>
              <p className="text-4xl font-display font-bold text-accent">+{stats?.xp ? stats.xp % 100 : 0} XP</p>
            </div>
            <div className="h-px bg-border/50" />
            <div>
              <p className="text-muted-foreground text-sm font-medium mb-1">Tasks Completed</p>
              <p className="text-4xl font-display font-bold text-white">
                {tasks?.filter(t => t.isCompleted).length || 0}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Quests */}
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-8 bg-orange-500 rounded-full" />
            Daily Quests
          </h3>
          <div className="space-y-3">
            {dailyQuests.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center text-center text-muted-foreground">
                <p>All dailies completed!</p>
                <p className="text-sm mt-1">Check back tomorrow for more.</p>
              </div>
            ) : (
              dailyQuests.map((task) => (
                <motion.div 
                  key={task.id}
                  layout
                  className="group bg-card hover:bg-card/80 border border-border hover:border-primary/50 rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <button 
                      disabled={isCompleting}
                      onClick={() => completeTask(task.id)}
                      className="mt-1 text-muted-foreground hover:text-accent transition-colors disabled:opacity-50"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs font-medium">
                        <span className="text-accent bg-accent/10 px-2 py-0.5 rounded">+{task.rewardXp} XP</span>
                        <span className="text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">+{task.rewardPoints} Gold</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Priority List */}
        <div>
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-500 rounded-full" />
            Active Tasks
          </h3>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className={`w-2 h-2 rounded-full ${
                  task.difficulty === 'hard' ? 'bg-red-500' : 
                  task.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{task.category} • {task.difficulty}</p>
                </div>
                {task.dueDate && (
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                    {format(new Date(task.dueDate), "MMM d")}
                  </span>
                )}
              </div>
            ))}
            <Link href="/tasks" className="block text-center p-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:bg-accent/5 hover:text-accent hover:border-accent/20 transition-all">
              + Add New Task
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
