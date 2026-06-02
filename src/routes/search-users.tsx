import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Search as SearchIcon, Loader2, User } from "lucide-react";

export const Route = createFileRoute("/search-users")({
  component: SearchUsersPage,
});

function SearchUsersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all users on mount
  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, username, name")
        .neq("id", user.id)
        .order("username");
      setAllUsers(data || []);
      setSearchResults(data || []);
      setIsLoading(false);
    };
    fetchAll();
  }, [user]);

  // Filter locally as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
      return;
    }
    const q = searchQuery.toLowerCase();
    setSearchResults(
      allUsers.filter(
        (p) =>
          p.username?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, allUsers]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to search users.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Find People</h1>

        {/* Search bar */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : searchResults.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {searchQuery ? `No users found for "${searchQuery}"` : "No other users yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {searchResults.map((profile) => (
              <button
                key={profile.id}
                onClick={() => navigate({ to: `/user/${profile.id}` })}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:bg-accent"
              >
                {/* Avatar initial */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {profile.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{profile.username}</p>
                  {profile.name && profile.name !== profile.username && (
                    <p className="truncate text-sm text-muted-foreground">{profile.name}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
