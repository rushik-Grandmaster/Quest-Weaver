import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Camera, Upload, Loader2, Scale, Ruler, Percent } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const bodyFatSchema = z.object({
  height: z.coerce.number().min(50).max(300),
  weight: z.coerce.number().min(20).max(500),
  image: z.string().min(1, "Photo is required"),
});

type BodyFatFormData = z.infer<typeof bodyFatSchema>;

export default function BodyFatAnalysis() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ bodyFat: number; analysis: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<BodyFatFormData>({
    resolver: zodResolver(bodyFatSchema),
    defaultValues: {
      height: 170,
      weight: 70,
      image: "",
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        form.setValue("image", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: BodyFatFormData) => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/ai/body-fat", data);
      const json = await res.json();
      setResult(json);
      toast({
        title: "Analysis Complete",
        description: `Estimated Body Fat: ${json.bodyFat}%`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Please try again with a clearer photo.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
          AI Body Fat Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload a clear full-body photo for an accurate AI-powered estimation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Your Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ruler className="w-4 h-4" /> Height (cm)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Scale className="w-4 h-4" /> Weight (kg)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Camera className="w-4 h-4" /> Progress Photo
                  </FormLabel>
                  <div className="relative aspect-[3/4] rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 overflow-hidden group">
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="secondary" onClick={() => setImagePreview(null)}>
                            Change Photo
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                        <Upload className="w-12 h-12 text-primary/40" />
                        <div className="space-y-1">
                          <p className="font-medium">Click to upload photo</p>
                          <p className="text-xs text-muted-foreground">Front view, standing straight</p>
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleImageUpload}
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage>{form.formState.errors.image?.message}</FormMessage>
                </div>

                <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing Composition...
                    </>
                  ) : (
                    "Estimate Body Fat"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="bg-primary/5 border-primary/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Percent className="w-24 h-24" />
                </div>
                <CardHeader>
                  <CardTitle>Estimation Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-6xl font-bold text-primary">
                    {result.bodyFat}%
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-primary/10">
                    <p className="text-sm leading-relaxed italic">
                      "{result.analysis}"
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">BMI Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {(form.getValues("weight") / Math.pow(form.getValues("height") / 100, 2)).toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Daily Goal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">Keep Pushing</div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
