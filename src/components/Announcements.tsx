import { useEffect, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Announcement = {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
};

export function Announcements({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const post = async () => {
    const msg = text.trim();
    if (!msg) return;
    setPosting(true);
    const { error } = await supabase
      .from("announcements")
      .insert({ message: msg, created_by: userId });
    setPosting(false);
    if (error) return toast.error(error.message);
    setText("");
    toast.success("Announcement posted");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (items.length === 0 && !isAdmin) return null;

  return (
    <section className="mb-8 space-y-3">
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Megaphone className="h-4 w-4 text-primary" /> Post an announcement
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Visible to everyone for 24 hours..."
            rows={2}
            maxLength={500}
          />
          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={post} disabled={posting || !text.trim()}>
              {posting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}
      {items.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
        >
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">{a.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Admin announcement · {new Date(a.created_at).toLocaleString()}
            </p>
          </div>
          {isAdmin && (
            <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}