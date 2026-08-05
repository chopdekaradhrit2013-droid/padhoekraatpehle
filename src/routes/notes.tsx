import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { toast } from "sonner";
import {
  Upload, FileText, ImageIcon, Trash2, ShieldAlert, ShieldCheck, Ban,
  Search, X, Filter, ExternalLink, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Announcements } from "@/components/Announcements";

export const Route = createFileRoute("/notes")({
  component: NotesPage,
});

const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"] as const;
const SUBJECTS = [
  "Hindi", "Marathi", "English Language", "English Literature",
  "Maths", "Computers", "History", "Geography", "Physics", "Chemistry", "Biology",
] as const;

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
  class_level?: string | null;
  subject?: string | null;
};

type NoteWithUser = NoteRow & { username: string; uploader_name: string };
type NoteWithUserExt = NoteWithUser & { is_admin: boolean; banned: boolean };

function NoteThumbnail({ note }: { note: NoteWithUser }) {
  const isImage = note.file_type?.startsWith("image/");
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    supabase.storage
      .from("notes")
      .createSignedUrl(note.file_path, 60 * 30)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setFailed(true);
          return;
        }
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [note.file_path, isImage]);

  if (!isImage || failed || !url) {
    return (
      <div className="flex aspect-video items-center justify-center bg-muted/30">
        {isImage ? (
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        ) : (
          <FileText className="h-10 w-10 text-muted-foreground" />
        )}
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden bg-muted/30">
      <img
        src={url}
        alt={note.title}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function NotesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithUserExt[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [banChecked, setBanChecked] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [myNotesOnly, setMyNotesOnly] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  // Enforce bans: banned users are signed out and sent to login
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("banned")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.banned) {
        toast.error("Your account has been banned. Contact the admin if you think this is a mistake.");
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }
      setBanChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

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
    if (user && banChecked) fetchNotes();
  }, [user, banChecked]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (myNotesOnly && note.user_id !== user?.id) return false;
      if (classFilter !== "all" && note.class_level !== classFilter) return false;
      if (subjectFilter !== "all" && note.subject !== subjectFilter) return false;
      if (q) {
        const haystack = `${note.title} ${note.description ?? ""} ${note.file_name ?? ""} ${note.username}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [notes, searchQuery, classFilter, subjectFilter, myNotesOnly, user?.id]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    classFilter !== "all" ||
    subjectFilter !== "all" ||
    myNotesOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setClassFilter("all");
    setSubjectFilter("all");
    setMyNotesOnly(false);
  };

  const handleDelete = async (note: NoteWithUserExt) => {
    setDeletingId(note.id);
    try {
      await supabase.storage.from("notes").remove([note.file_path]);
      const { error } = await supabase.from("notes").delete().eq("id", note.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Note deleted");
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!isAdmin || notes.length === 0) return;
    setDeletingAll(true);
    try {
      const paths = notes.map((n) => n.file_path).filter(Boolean);
      for (let i = 0; i < paths.length; i += 50) {
        const chunk = paths.slice(i, i + 50);
        await supabase.storage.from("notes").remove(chunk);
      }
      const { error } = await supabase.from("notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`Deleted all ${notes.length} notes`);
      setNotes([]);
    } finally {
      setDeletingAll(false);
    }
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

  if (loading || !user || !banChecked) {
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
              Everything your squad has uploaded. Click any note to open its page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && notes.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deletingAll}>
                    {deletingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete all notes
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all notes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {notes.length} notes and their files from storage.
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <UploadDialog onDone={fetchNotes} userId={user.id} />
          </div>
        </div>

        <Announcements userId={user.id} isAdmin={isAdmin} />

        <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filter notes
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, file name or uploader..."
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-40">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant={myNotesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setMyNotesOnly((v) => !v)}
              className="whitespace-nowrap"
            >
              My notes only
            </Button>

            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3.5 w-3.5" /> Clear filters
              </Button>
            )}
          </div>

          {!fetching && notes.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredNotes.length} of {notes.length} notes
              {hasActiveFilters && " (filtered)"}
            </p>
          )}
        </div>

        {fetching ? (
          <div className="py-16 text-center text-muted-foreground">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="text-muted-foreground">No notes yet. Be the first to upload!</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="text-muted-foreground">No notes match your filters.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => {
              const canDelete = note.user_id === user.id || isAdmin;
              const isDeleting = deletingId === note.id;
              return (
                <article
                  key={note.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md"
                >
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
                  <Link to="/note/$noteId" params={{ noteId: note.id }} className="block">
                    <NoteThumbnail note={note} />
                  </Link>
                  <div className="p-4">
                    <Link to="/note/$noteId" params={{ noteId: note.id }}>
                      <h3 className="font-semibold leading-tight hover:underline">{note.title}</h3>
                    </Link>
                    {note.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.description}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground truncate">{note.file_name}</p>
                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" variant="default" className="flex-1">
                        <Link to="/note/$noteId" params={{ noteId: note.id }}>
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                        </Link>
                      </Button>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              disabled={isDeleting}
                              title="Delete note"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                              <AlertDialogDescription>
                                “{note.title}” will be permanently removed, including the file.
                                This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(note)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
                  {SUBJECTS.map((s) => (
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
