import { useState } from "react";
import { useSchedule, useCreateScheduleItem, useDeleteScheduleItem } from "@/hooks/use-schedule";
import { format, startOfDay, addHours } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertScheduleItemSchema, type InsertScheduleItem } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Clock } from "lucide-react";

export default function Schedule() {
  const { data: items, isLoading } = useSchedule();
  const { mutate: deleteItem } = useDeleteScheduleItem();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Group items by time slots or just render as list for simplicity first
  const sortedItems = items?.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold font-display">Daily Planner</h1>
          <p className="text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM do, yyyy")}</p>
        </div>
        <CreateScheduleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {/* Timeline View */}
        <div className="relative border-l-2 border-border ml-4 pl-8 py-4 space-y-8">
          {sortedItems?.map((item) => (
            <div key={item.id} className="relative group">
              {/* Timeline Dot */}
              <div className="absolute -left-[39px] top-4 w-5 h-5 rounded-full bg-card border-4 border-primary z-10" />
              
              <div className="bg-card rounded-xl p-5 border border-border hover:border-primary/30 transition-colors shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Clock className="w-4 h-4" />
                    {format(new Date(item.startTime), "h:mm a")} - {format(new Date(item.endTime), "h:mm a")}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <h3 className="text-lg font-bold">{item.title}</h3>
                {item.description && (
                  <p className="text-muted-foreground text-sm mt-1">{item.description}</p>
                )}
              </div>
            </div>
          ))}
          
          {sortedItems?.length === 0 && (
            <div className="text-muted-foreground text-sm italic pl-2">
              No schedule items for today. Plan your victory!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createItem, isPending } = useCreateScheduleItem();
  const form = useForm<InsertScheduleItem>({
    resolver: zodResolver(insertScheduleItemSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: new Date(), // These will need to be handled carefully in form
      endTime: addHours(new Date(), 1),
    }
  });

  const onSubmit = (data: InsertScheduleItem) => {
    // Ensure dates are date objects (zod coerce handles strings from input type="datetime-local" if set up right, but safe to cast here)
    createItem({
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime)
    }, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input {...form.register("title")} placeholder="Event title" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea {...form.register("description")} placeholder="Details..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Input 
                type="datetime-local" 
                {...form.register("startTime", { valueAsDate: true })} 
                // Default value handling for datetime-local is tricky in React, skipping complex logic for MVP
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Time</label>
              <Input 
                type="datetime-local" 
                {...form.register("endTime", { valueAsDate: true })} 
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Adding..." : "Add Event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
