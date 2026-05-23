import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { GoogleButton } from "@/components/GoogleButton";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function makeCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [captcha, setCaptcha] = useState(makeCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/notes" });
  }, [user, navigate]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const passwordTooShort = password.length > 0 && password.length < 6;

  const usernameValid = useMemo(() => /^[a-zA-Z0-9_]{3,20}$/.test(username), [username]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameValid) {
      toast.error("Username must be 3–20 letters, numbers, or underscores.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (parseInt(captchaInput, 10) !== captcha.answer) {
      toast.error("Captcha is incorrect. Please try again.");
      setCaptcha(makeCaptcha());
      setCaptchaInput("");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/notes",
        data: { username, name, phone: phone || null },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Auto sign-in (email auto-confirm is enabled)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInErr) {
      toast.success("Account created! Please sign in.");
      navigate({ to: "/login" });
      return;
    }
    toast.success("Welcome to PadhoEkRaatPehle!");
    navigate({ to: "/notes" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto flex max-w-md flex-col px-4 py-12">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join your study squad.</p>

          <div className="mt-6">
            <GoogleButton label="Sign up with Google" />
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
              {username && !usernameValid && (
                <p className="mt-1 text-xs text-destructive">3–20 letters, numbers, or underscores.</p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {passwordTooShort && (
                <p className="mt-1 text-xs text-destructive">Password must be at least 6 characters.</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={mismatch ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {mismatch && (
                <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <Label htmlFor="captcha">Are you human? Solve:</Label>
              <div className="mt-2 flex items-center gap-2">
                <div className="rounded-md bg-background px-3 py-2 font-mono text-sm">
                  {captcha.a} + {captcha.b} = ?
                </div>
                <Input
                  id="captcha"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-24"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCaptcha(makeCaptcha()); setCaptchaInput(""); }}
                  aria-label="New captcha"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || mismatch}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already a member?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}