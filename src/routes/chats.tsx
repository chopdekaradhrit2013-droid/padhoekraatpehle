import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chats")({
  component: ChatsPage,
});

type Conversation = {
  id: string;
  other: { id: string; username: string; name: string };
  last_message?: string;
  last_at?: string;
};

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function ChatsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { with?: string };

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeOther, setActiveOther] = useState<Conversation["other"] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all conversations for current user
  const loadConversations = async () => {
    if (!user) return;
    setLoadingConvs(true);
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        user1_id,
        user2_id,
        last_message,
        last_message_at,
        user1:profiles!conversations_user1_id_fkey(id, username, name),
        user2:profiles!conversations_user2_id_fkey(id, username, name)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!error && data) {
      const convs: Conversation[] = data.map((c: any) => ({
        id: c.id,
        other: c.user1_id === user.id ? c.user2 : c.user1,
        last_message: c.last_message,
        last_at: c.last_message_at,
      }));
      setConversations(convs);

      // Auto-open if navigated with ?with=userId — use convs directly (not stale state)
      if (search.with) {
        const target = convs.find((c) => c.other?.id === search.with);
        if (target) {
          setActiveConvId(target.id);
          setActiveOther(target.other);
          loadMessages(target.id);
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    }
    setLoadingConvs(false);
  };

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const openConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setActiveOther(conv.other);
    loadMessages(conv.id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const loadMessages = async (convId: string) => {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setLoadingMsgs(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeConvId) return;
    const channel = supabase
      .channel(`messages:${activeConvId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates from optimistic updates
            if (prev.find((m) => m.id === (payload.new as Message).id)) return prev;
            return [...prev, payload.new as Message];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvId]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvId || !user) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConvId,
      sender_id: user.id,
      content,
    });

    if (!error) {
      // Update last_message on conversation
      await supabase
        .from("conversations")
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq("id", activeConvId);

      // Update local conversation list preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId ? { ...c, last_message: content, last_at: new Date().toISOString() } : c
        )
      );
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access chats.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — conversation list */}
        <div
          className={cn(
            "flex w-full flex-col border-r border-border md:w-80 md:flex shrink-0",
            activeConvId ? "hidden md:flex" : "flex"
          )}
        >
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-lg font-bold">Chats</h2>
          </div>

          {loadingConvs ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ to: "/search-users" })}
              >
                Find People
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent",
                    activeConvId === conv.id && "bg-accent"
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {conv.other?.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate font-medium text-foreground">{conv.other?.username}</p>
                      {conv.last_at && (
                        <span className="shrink-0 text-xs text-muted-foreground ml-2">
                          {formatDate(conv.last_at)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {conv.last_message ?? "Say hi 👋"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat window */}
        {activeConvId && activeOther ? (
          <div className="flex flex-1 flex-col">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setActiveConvId(null); setActiveOther(null); setMessages([]); }}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {activeOther.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{activeOther.username}</p>
                <p className="text-xs text-muted-foreground">{activeOther.name}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingMsgs ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-muted-foreground text-sm">No messages yet. Say hi! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === user.id;
                    const showDate =
                      i === 0 ||
                      new Date(msg.created_at).toDateString() !==
                        new Date(messages[i - 1].created_at).toDateString();
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                              isMine
                                ? "rounded-tr-sm bg-primary text-primary-foreground"
                                : "rounded-tl-sm bg-muted text-foreground"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p
                              className={cn(
                                "mt-0.5 text-right text-[10px]",
                                isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full"
                  disabled={sending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMsg.trim() || sending}
                  size="icon"
                  className="rounded-full shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageCircle className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-lg font-medium text-muted-foreground">Select a conversation</p>
            <p className="text-sm text-muted-foreground">or</p>
            <Button variant="outline" onClick={() => navigate({ to: "/search-users" })}>
              Find Someone to Chat With
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
