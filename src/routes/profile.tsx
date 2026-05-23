import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ username: string; name: string; phone: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) { setProfile(data); setName(data.name); setPhone(data.phone ?? ""); }
      });
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name, phone: phone || null }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setProfile((p) => p ? { ...p, name, phone: phone || null } : p);
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const initials = profile.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                {profile.name}
                {isAdmin && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> ADMIN
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
            </div>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        </div>
      </main>
    </div>
  );
}