import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/chats")({
  component: ChatsPage,
});

function ChatsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access chats.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Chats</h1>
        <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12">
          <p className="text-muted-foreground">Chat feature coming soon...</p>
        </div>
      </div>
    </div>
  );
}
