import { useState } from "react";
import { useDiaryEntries, useCreateDiaryEntry, useUpdateDiaryEntry, useDeleteDiaryEntry } from "@/hooks/use-diary";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDiaryEntrySchema, type InsertDiaryEntry } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, BookOpen, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Diary() {
  const { data: entries, isLoading } = useDiaryEntries();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  const sortedEntries = entries?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold font-display">My Diary</h1>
          <p className="text-muted-foreground mt-1">Write your thoughts and feelings</p>
        </div>
        <CreateDiaryDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {sortedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
              <BookOpen className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold mb-2">No diary entries yet</h3>
            <p className="text-muted-foreground">Start writing to capture your moments!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-colors group"
                data-testid={`card-diary-${entry.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {entry.mood || 'neutral'}
                      </span>
                      <p className="text-sm text-muted-foreground">{format(new Date(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditEntryDialog entryId={entry.id} currentContent={entry.content} currentMood={entry.mood} />
                    <DeleteButton entryId={entry.id} />
                  </div>
                </div>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                {entry.updatedAt !== entry.createdAt && (
                  <p className="text-xs text-muted-foreground mt-3">edited {format(new Date(entry.updatedAt), "MMM d, yyyy")}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateDiaryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { mutate: createEntry, isPending } = useCreateDiaryEntry();
  const { toast } = useToast();
  const form = useForm<InsertDiaryEntry>({
    resolver: zodResolver(insertDiaryEntrySchema),
    defaultValues: {
      content: "",
      mood: "neutral",
    }
  });

  const onSubmit = (data: InsertDiaryEntry) => {
    createEntry(data, {
      onSuccess: () => {
        toast({
          title: "Entry saved!",
          description: "Your diary entry has been added.",
          variant: "default"
        });
        onOpenChange(false);
        form.reset();
      },
      onError: (error: any) => {
        toast({
          title: "Failed to save entry",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground" data-testid="button-new-entry">
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a new diary entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">How are you feeling?</label>
            <Select defaultValue="neutral" onValueChange={(value) => form.setValue("mood", value as any)}>
              <SelectTrigger data-testid="select-mood">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="excited">Excited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Your thoughts</label>
            <Textarea 
              {...form.register("content")} 
              placeholder="What's on your mind today?"
              className="min-h-[200px]"
              data-testid="textarea-content"
            />
            {form.formState.errors.content && <p className="text-xs text-destructive">{form.formState.errors.content.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-entry">
            {isPending ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({ entryId, currentContent, currentMood }: { entryId: number; currentContent: string; currentMood: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: updateEntry, isPending } = useUpdateDiaryEntry();
  const { toast } = useToast();
  const form = useForm<Partial<InsertDiaryEntry>>({
    defaultValues: {
      content: currentContent,
      mood: currentMood as any,
    }
  });

  const onSubmit = (data: Partial<InsertDiaryEntry>) => {
    updateEntry({ id: entryId, data }, {
      onSuccess: () => {
        toast({
          title: "Entry updated!",
          variant: "default"
        });
        setIsOpen(false);
      },
      onError: (error: any) => {
        toast({
          title: "Failed to update entry",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" data-testid={`button-edit-${entryId}`}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit diary entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mood</label>
            <Select defaultValue={currentMood} onValueChange={(value) => form.setValue("mood", value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="excited">Excited</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea 
              {...form.register("content")} 
              className="min-h-[200px]"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Updating..." : "Update Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ entryId }: { entryId: number }) {
  const { mutate: deleteEntry, isPending } = useDeleteDiaryEntry();
  const { toast } = useToast();

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => {
        deleteEntry(entryId, {
          onSuccess: () => {
            toast({
              title: "Entry deleted",
              variant: "default"
            });
          },
          onError: (error: any) => {
            toast({
              title: "Failed to delete entry",
              description: error.message,
              variant: "destructive"
            });
          }
        });
      }}
      disabled={isPending}
      data-testid={`button-delete-${entryId}`}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}
