import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, LogOut, BookOpen, Home, User as UserIcon, ShieldCheck, Upload as UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/notes", label: "Home", icon: Home },
  { to: "/profile", label: "Profile", icon: UserIcon },
  { to: "/upload", label: "Upload", icon: UploadIcon },
  { to: "/about-admin", label: "About Admin", icon: ShieldCheck },
] as const;

export function Header() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight sm:inline">PadhoEkRaatPehle</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {user ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={signOut}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      {user && (
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}