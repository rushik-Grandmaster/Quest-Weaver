import { Loader2, Gamepad2 } from "lucide-react";

export default function Login() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1920&q=80')] bg-cover bg-center">
      {/* Descriptive comment: Dark moody gaming setup background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-md p-8 bg-card/80 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold tracking-tight">LifeRPG</h1>
          <p className="text-muted-foreground text-lg">Gamify your productivity.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black font-bold rounded-xl text-lg hover:bg-gray-200 transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-xl"
          >
            Start Your Journey
          </button>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Login via Replit
          </p>
        </div>
      </div>
    </div>
  );
}
