import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
        </div>
        <h1 className="text-4xl font-bold font-display">404 - Level Not Found</h1>
        <p className="text-muted-foreground text-lg">
          The quest you are looking for does not exist in this realm.
        </p>
        <Link href="/">
          <Button className="w-full" size="lg">
            Return to Base
          </Button>
        </Link>
      </div>
    </div>
  );
}
