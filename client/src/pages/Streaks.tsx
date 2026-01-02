import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, CheckCircle2, Trophy, Calendar } from "lucide-react";
import { Task, UserStats } from "@shared/schema";
import { motion } from "framer-motion";

export default function Streaks() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user-stats"],
  });

  if (tasksLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completedTasks = tasks?.filter((t) => t.isCompleted) || [];
  const completionRate = tasks?.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold font-display flex items-center gap-3">
          <Flame className="text-orange-500 w-10 h-10" /> Streaks & Achievements
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your consistency and maintain your momentum, Rushik Sama.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 backdrop-blur border-primary/20 hover-elevate overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.streak || 0} Days</div>
            <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/20 hover-elevate overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks completed today</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/20 hover-elevate overflow-visible">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Total Quests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Quests finished all time</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur border-primary/10 overflow-visible">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No completed tasks yet. Start your first quest!</p>
            ) : (
              completedTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">{task.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    +{task.rewardXp} XP
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
