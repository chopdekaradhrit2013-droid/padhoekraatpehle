import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload as UploadIcon } from "lucide-react";

export const Route = createFileRoute("/upload")({ component: UploadPage });

function UploadPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return toast.error("Please select a file");
    if (file.size > 25 * 1024 * 1024) return toast.error("File too large (max 25 MB)");
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("notes").upload(path, file, {
      contentType: file.type || undefined,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error: insErr } = await supabase.from("notes").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      file_path: path,
      file_type: file.type || null,
      file_name: file.name,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Uploaded!");
    navigate({ to: "/notes" });
  };

  if (loading || !user) return (
    <div className="min-h-screen bg-background"><Header />
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UploadIcon className="h-6 w-6 text-primary" /> Upload a note
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Share PDFs, photos, scans up to 25 MB.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
            </div>
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
            </div>
            <div>
              <Label htmlFor="file">File</Label>
              <Input id="file" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.txt" />
            </div>
            <Button type="submit" className="w-full" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}