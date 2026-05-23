import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/forgot-password" });
  }, [user, loading, navigate]);

  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated! You're signed in.");
    navigate({ to: "/notes" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">You&apos;ll be signed in automatically.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="cf">Confirm password</Label>
              <Input id="cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                className={mismatch ? "border-destructive focus-visible:ring-destructive" : ""} />
              {mismatch && <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={saving || mismatch}>
              {saving ? "Saving..." : "Update password"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}