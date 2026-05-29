import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
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
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const handleChat = async () => {
    // Navigate to chats page with this user
    // You can implement a direct message feature later
    toast.success("Chat feature coming soon!");
  };

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const { error } = await supabase.from("blocked_users").insert({
        blocker_id: user.id,
        blocked_id: userId,
      });

      if (error) throw error;
      toast.success("User blocked successfully");
    } catch (error) {
      console.error("Error blocking user:", error);
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
        reason: "User report from profile view",
      });

      if (error) throw error;
      toast.success("User reported successfully");
    } catch (error) {
      console.error("Error reporting user:", error);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate({ to: "/search-users" })} 
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>

        <div className="rounded-lg border border-border bg-card p-8">
          <div className="flex flex-col items-center gap-6">
            {profile.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-24 w-24 rounded-full object-cover"
              />
            )}

            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">{profile.username}</h1>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>

            {profile.bio && (
              <p className="max-w-lg text-center text-foreground">{profile.bio}</p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-4">
              <Button
                onClick={handleChat}
                className="gap-2"
                disabled={profile.id === user.id}
              >
                <MessageCircle className="h-4 w-4" />
                Chat
              </Button>

              <Button
                onClick={handleReport}
                variant="outline"
                className="gap-2 text-orange-600 hover:text-orange-700"
                disabled={profile.id === user.id || isReporting}
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
                className="gap-2 text-red-600 hover:text-red-700"
                disabled={profile.id === user.id || isBlocking}
              >
                {isBlocking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Block
              </Button>
            </div>

            {profile.id === user.id && (
              <p className="text-sm text-muted-foreground">This is your profile</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
