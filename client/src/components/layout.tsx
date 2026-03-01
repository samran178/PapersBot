import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, LogOut, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

import logoUrl from "@assets/WhatsApp_Image_2026-03-01_at_12.29.09_PM_1772352996932.jpeg";

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
              <img src={logoUrl} alt="PaperBot" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">PaperBot</span>
          </Link>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground capitalize">
                  {user.username} <span className="text-muted-foreground font-normal">({user.role})</span>
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
