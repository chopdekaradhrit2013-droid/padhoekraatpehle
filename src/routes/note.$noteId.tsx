import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Download, ExternalLink, FileText, ImageIcon,
  Copy, Check, Loader2, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/note/$noteId")({
  component: NoteDetailPage,
});

type NoteDetail = {
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
  username: string;
  uploader_name: string;
};

function NoteDetailPage() {
  const { noteId } = useParams({ from: "/note/$noteId" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

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

  useEffect(() => {
    if (!user || !noteId) return;

    const load = async () => {
      setLoading(true);
      const { data: n, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .maybeSingle();

      if (error || !n) {
        toast.error("Note not found");
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("username, name")
        .eq("id", n.user_id)
        .maybeSingle();

      setNote({
        ...n,
        username: prof?.username ?? "unknown",
        uploader_name: prof?.name ?? "Unknown",
      });

      const { data: signed } = await supabase.storage
        .from("notes")
        .createSignedUrl(n.file_path, 60 * 60);

      if (signed?.signedUrl) setFileUrl(signed.signedUrl);
      setLoading(false);
    };

    load();
  }, [user, noteId]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/note/${noteId}`
      : `/note/${noteId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    setDeleting(true);
    try {
      await supabase.storage.from("notes").remove([note.file_path]);
      const { error } = await supabase.from("notes").delete().eq("id", note.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Note deleted");
      navigate({ to: "/notes" });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-muted-foreground">Note not found.</p>
          <Button asChild className="mt-4" variant="outline">
            <Link to="/notes">Back to notes</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isImage = note.file_type?.startsWith("image/");
  const isPdf = note.file_type === "application/pdf" || note.file_name?.toLowerCase().endsWith(".pdf");
  const canDelete = note.user_id === user.id || isAdmin;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-6 gap-2">
          <Link to="/notes">
            <ArrowLeft className="h-4 w-4" /> Back to notes
          </Link>
        </Button>

        <article className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-5 py-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Uploaded by</span>
            <span className="font-semibold">@{note.username}</span>
            {note.class_level && <Badge variant="secondary">{note.class_level}</Badge>}
            {note.subject && <Badge variant="outline">{note.subject}</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(note.created_at).toLocaleString()}
            </span>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{note.title}</h1>
              {note.description && (
                <p className="mt-2 text-muted-foreground">{note.description}</p>
              )}
              {note.file_name && (
                <p className="mt-1 text-xs text-muted-foreground font-mono">{note.file_name}</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-sm font-mono text-foreground">
                {shareUrl.replace(/^https?:\/\//, "")}
              </code>
              <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>

            <div className="rounded-xl border border-border overflow-hidden bg-muted/20">
              {fileUrl && isImage ? (
                <img
                  src={fileUrl}
                  alt={note.title}
                  className="w-full max-h-[70vh] object-contain bg-black/5"
                />
              ) : fileUrl && isPdf ? (
                <iframe
                  src={fileUrl}
                  title={note.title}
                  className="w-full h-[70vh] border-0"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                  {isImage ? (
                    <ImageIcon className="h-12 w-12" />
                  ) : (
                    <FileText className="h-12 w-12" />
                  )}
                  <p className="text-sm">Preview not available for this file type</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {fileUrl && (
                <>
                  <Button asChild>
                    <a href={fileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" /> Open file
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={fileUrl} download={note.file_name ?? true}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  </Button>
                </>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete note
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
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
