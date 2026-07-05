import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import { Upload, FileText, ImageIcon, Trash2, Download, ShieldAlert, ShieldCheck, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Announcements } from "@/components/Announcements";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
  class_level?: string;
  subject?: string;
};

type NoteWithUser = NoteRow & { username: string; uploader_name: string };
type NoteWithUserExt = NoteWithUser & { is_admin: boolean; banned: boolean };

function NotesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithUserExt[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const fetchNotes = async () => {
    setFetching(true);
    const { data: noteData, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setFetching(false);
      return;
    }
    const ids = Array.from(new Set((noteData ?? []).map((n) => n.user_id)));
    const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, username, name, banned").in("id", safeIds),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin").in("user_id", safeIds),
    ]);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
    const adminSet = new Set((roles ?? []).map((r) => r.user_id));
    setNotes(
      (noteData ?? []).map((n) => ({
        ...n,
        username: profMap.get(n.user_id)?.username ?? "unknown",
        uploader_name: profMap.get(n.user_id)?.name ?? "Unknown",
        is_admin: adminSet.has(n.user_id),
        banned: profMap.get(n.user_id)?.banned ?? false,
      })),
    );
    setFetching(false);
  };

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const handleDownload = async (note: NoteWithUser) => {
    const { data, error } = await supabase.storage
      .from("notes")
      .createSignedUrl(note.file_path, 60 * 10);
    if (error || !data) return toast.error("Could not open file");
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (note: NoteWithUserExt) => {
    if (!confirm("Delete this note?")) return;
    await supabase.storage.from("notes").remove([note.file_path]);
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    fetchNotes();
  };

  const handleBan = async (note: NoteWithUserExt) => {
    const next = !note.banned;
    if (!confirm(`${next ? "Ban" : "Unban"} @${note.username}?`)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ banned: next })
      .eq("id", note.user_id);
    if (error) return toast.error(error.message);
    toast.success(next ? "User banned" : "User unbanned");
    fetchNotes();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Shared Notes
              {isAdmin && <Badge variant="destructive" className="text-xs">ADMIN</Badge>}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything your squad has uploaded. Click any note to view or download.
            </p>
          </div>
          <UploadDialog onDone={fetchNotes} userId={user.id} />
        </div>

        <Announcements userId={user.id} isAdmin={isAdmin} />

        {fetching ? (
          <div className="py-16 text-center text-muted-foreground">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="text-muted-foreground">No notes yet. Be the first to upload!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => {
              const isImage = note.file_type?.startsWith("image/");
              const canDelete = note.user_id === user.id || isAdmin;
              return (
                <article key={note.id} className="overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
                  <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground">Uploaded by</span>
                    <span className="font-semibold text-foreground">@{note.username}</span>
                    {note.is_admin && (
                      <Badge variant="destructive" className="h-4 px-1.5 text-[10px] gap-1">
                        <ShieldCheck className="h-2.5 w-2.5" /> admin
                      </Badge>
                    )}
                    {note.banned && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] gap-1 border-destructive text-destructive">
                        <ShieldAlert className="h-2.5 w-2.5" /> banned
                      </Badge>
                    )}
                    {note.class_level && <Badge variant="secondary">{note.class_level}</Badge>}
                    {note.subject && <Badge variant="outline">{note.subject}</Badge>}
                  </div>
                  <div className="flex aspect-video items-center justify-center bg-muted/30">
                    {isImage ? (
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold leading-tight">{note.title}</h3>
                    {note.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground truncate">{note.file_name}</p>
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="default" className="flex-1" onClick={() => handleDownload(note)}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Open
                      </Button>
                      {canDelete && (
                        <Button size="sm" variant="outline" onClick={() => handleDelete(note)} title="Delete note">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isAdmin && note.user_id !== user.id && (
                        <Button
                          size="sm"
                          variant={note.banned ? "outline" : "destructive"}
                          onClick={() => handleBan(note)}
                          title={note.banned ? "Unban user" : "Ban user"}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function UploadDialog({ onDone, userId }: { onDone: () => void; userId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setFile(null); setClassLevel(""); setSubject("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a file");
    if (!classLevel || !subject) return toast.error("Please select Class and Subject");
    if (file.size > 25 * 1024 * 1024) return toast.error("File too large (max 25 MB)");

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("notes").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }

    const { error: insErr } = await supabase.from("notes").insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      file_path: path,
      file_type: file.type || null,
      file_name: file.name,
      class_level: classLevel,
      subject: subject,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Uploaded!");
    reset();
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Upload className="mr-2 h-4 w-4" /> Upload note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a new note</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={setClassLevel} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {[6,7,8,9,10].map(c => (
                    <SelectItem key={c} value={`Class ${c}`}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {["Hindi", "Marathi", "English Language", "English Literature", "Maths", "Computers", "History", "Geography", "Physics", "Chemistry", "Biology"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="file">File (PDF, image, doc — up to 25 MB)</Label>
            <Input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.txt"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}