import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Upload, Loader2, Search, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function LuminousLens() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
    }
  };

  const handleAnalyze = async () => {
    if (!imagePreview) return;
    
    setIsAnalyzing(true);
    try {
      const res = await apiRequest("POST", "/api/ai/lens", { image: imagePreview });
      const data = await res.json();
      setAnalysis(data.analysis);
      toast({
        title: "Analysis Complete",
        description: "Luminous has identified the object.",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Luminous couldn't identify the object. Please try a clearer photo.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          Luminous Lens
        </h1>
        <p className="text-muted-foreground">
          Identify objects, translate text, or get information about anything using Luminous AI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" /> Visual Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative aspect-square rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 overflow-hidden group">
              {imagePreview ? (
                <>
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <Button variant="secondary" onClick={() => setImagePreview(null)}>
                      Clear
                    </Button>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <Search className="w-12 h-12 text-primary/40" />
                  <div className="space-y-1">
                    <p className="font-medium text-primary">Scan an object</p>
                    <p className="text-xs text-muted-foreground">Upload or take a photo</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                    <Button variant="outline" onClick={triggerUpload} className="flex-1">
                      <Upload className="w-4 h-4 mr-2" /> Upload
                    </Button>
                    <Button variant="outline" onClick={triggerCamera} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" /> Camera
                    </Button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleImageUpload(e);
                      if (fileInputRef.current) fileInputRef.current.removeAttribute("capture");
                    }}
                  />
                </div>
              )}
            </div>

            <Button 
              className="w-full h-12 text-lg font-bold" 
              disabled={!imagePreview || isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Identify with Luminous
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className="bg-primary/5 border-primary/30 h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Luminous Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                      {analysis}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
