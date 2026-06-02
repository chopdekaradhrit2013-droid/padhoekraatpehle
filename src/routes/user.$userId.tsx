import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { MessageCircle, AlertCircle, Ban, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/user/$userId")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { userId } = useParams({ from: "/user/$userId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view user profiles.</p>
      </div>
    );
  }

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, name, phone")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleChat = async () => {
    // Find or create a conversation, then go to chats
    try {
      // Check if conversation exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        navigate({ to: "/chats", search: { with: userId } as any });
        return;
      }

      const { error } = await supabase.from("conversations").insert({
        user1_id: user.id,
        user2_id: userId,
      });
      if (error) throw error;
      navigate({ to: "/chats", search: { with: userId } as any });
    } catch (err) {
      console.error(err);
      toast.error("Could not open chat");
    }
  };

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: userId,
      });
      if (error) throw error;
      toast.success("User blocked");
    } catch {
      toast.error("Failed to block user");
    } finally {
      setIsBlocking(false);
    }
  };

  const handleReport = async () => {
    setIsReporting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_id: userId,
        reason: "Reported from profile",
      });
      if (error) throw error;
      toast.success("User reported");
    } catch {
      toast.error("Failed to report user");
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const isSelf = profile.id === user.id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-md px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/search-users" })}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>

        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex flex-col items-center gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-3xl font-bold">
              {profile.username?.[0]?.toUpperCase() ?? "?"}
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
              {profile.name && (
                <p className="text-muted-foreground">{profile.name}</p>
              )}
            </div>

            {isSelf ? (
              <p className="text-sm text-muted-foreground italic">This is you 👋</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-3 pt-2 w-full">
                <Button onClick={handleChat} className="gap-2 flex-1">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Button>

                <Button
                  onClick={handleReport}
                  variant="outline"
                  className="gap-2 text-orange-500 border-orange-300 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                  disabled={isReporting}
                >
                  {isReporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  Report
                </Button>

                <Button
                  onClick={handleBlock}
                  variant="outline"
                  className="gap-2 text-red-500 border-red-300 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  disabled={isBlocking}
                >
                  {isBlocking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Block
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
