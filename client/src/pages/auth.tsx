import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import logoUrl from "@assets/WhatsApp_Image_2026-03-01_at_12.29.09_PM_1772352996932.jpeg";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const user = await login({ username, password });
        toast({ title: "Welcome back!", description: `Logged in as ${user.username}` });
        setLocation(user.role === 'teacher' ? "/teacher" : "/student");
      } else {
        const user = await register({ username, password, role });
        toast({ title: "Account created!", description: `Welcome ${user.username}` });
        setLocation(user.role === 'teacher' ? "/teacher" : "/student");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: err.message,
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background/50">
      {/* Left side branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-900 z-0 opacity-90" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex items-center justify-center shadow-xl border-2 border-white/20">
              <img src={logoUrl} alt="PaperBot" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">PaperBot</span>
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
            Elevate Your<br/>
            <span className="text-blue-200">Education.</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-md leading-relaxed">
            A professional platform for intelligent exam management and focused learning.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-zinc-300">
            <CheckCircle2 className="w-5 h-5 text-zinc-500" />
            <span>This project is developed under University of Gujrat</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-300">
            <CheckCircle2 className="w-5 h-5 text-zinc-500" />
            <span>Developed by Samran Taimoor | Arzoo Fatima</span>
          </div>
        </div>
      </div>

      {/* Right side form */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {isLogin ? "Enter your credentials to access your dashboard." : "Sign up to start managing exams."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">Username</label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  placeholder="e.g. jsmith"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-medium leading-none text-foreground">I am a...</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['student', 'teacher'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`px-4 py-3 rounded-xl border font-medium capitalize transition-all duration-200 ${
                          role === r 
                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                            : "border-input bg-transparent text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
            >
              {isPending ? "Please wait..." : (isLogin ? "Sign In" : "Create Account")}
              {!isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
